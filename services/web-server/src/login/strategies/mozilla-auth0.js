import assert from 'assert';
import request from 'superagent';
import passport from 'passport';
import Auth0Strategy from 'passport-auth0';
import User from '../User.js';
import PersonAPI from '../clients/PersonAPI.js';
import WebServerError from '../../utils/WebServerError.js';
import { encode, decode } from '../../utils/codec.js';
import tryCatch from '../../utils/tryCatch.js';
import login from '../../utils/login.js';
import verifyJwtAuth0 from '../../utils/verifyJwtAuth0/index.js';
import { applySecurityHeaders } from '../../utils/headers.js';

export default class MozillaAuth0 {
  constructor({ name, cfg, monitor }) {
    const strategyCfg = cfg.login.strategies[name];

    assert(strategyCfg.domain, `${name}.domain is required`);
    assert(strategyCfg.clientId, `${name}.clientId is required`);
    assert(strategyCfg.clientSecret, `${name}.clientSecret is required`);

    Object.assign(this, strategyCfg);

    this._personApi = null;
    this._personApiExp = null;
    this.identityProviderId = 'mozilla-auth0';
    this.monitor = monitor;
  }

  // Get a personAPI instance, by requesting an API token as needed.
  // See https://github.com/mozilla-iam/cis/blob/f90ba5033785fd4fb14faf9f066e17356babb5aa/docs/PersonAPI.md#do-you-have-code-examples
  async fetchAccessToken() {
    const res = await request.post(`https://${this.domain}/oauth/token`)
      .set('content-type', 'application/json')
      .send({
        audience: 'api.sso.mozilla.com',
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      });
    const {
      access_token: accessToken,
      expires_in: expiresIn,
    } = JSON.parse(res.text);
    const expires = new Date().getTime() + (expiresIn * 1000);

    if (!accessToken) {
      throw new Error('did not receive a token from Auth0 /oauth/token endpoint');
    }

    return { accessToken, expires };
  }

  get isTokenExpired() {
    const offset = 10 * 60 * 1000; // expire a bit earlier to be safe
    return this._personApiExp - offset < new Date().getTime();
  }

  async getPersonApi() {
    if (this._personApi && !this.isTokenExpired) {
      return this._personApi;
    }

    const { accessToken, expires } = await this.fetchAccessToken();
    if (this._personApi) {
      this._personApi.setAccessToken(accessToken);
    } else {
      this._personApi = new PersonAPI({ accessToken });
    }

    this._personApiExp = expires;

    return this._personApi;
  }

  async getUser({ userId }) {
    const personApi = await this.getPersonApi();
    const userProfile = await personApi.getProfileFromUserId(userId);
    const user = new User();

    if (!userProfile) {
      this.monitor.warning({
        message: 'User profile not found',
        userId,
        identityProviderId: this.identityProviderId,
      });

      return;
    }

    if (!userProfile.user_id) {
      this.monitor.warning({
        message: 'Profile is missing user_id; rejecting',
        userId,
        identityProviderId: this.identityProviderId,
      });

      return;
    }

    if ('active' in userProfile && !userProfile.active) {
      this.monitor.warning({
        message: 'User is not active; rejecting',
        userId: userProfile.user_id,
        identityProviderId: this.identityProviderId,
      });

      return;
    }

    user.identity = this.identityFromProfile(userProfile);

    // take a user and attach roles to it
    this.addRoles(userProfile, user);

    return user;
  }

  async userFromIdentity(identity) {
    const encodedUserId = identity.split('/')[1];
    const userId = decode(encodedUserId);
    const user = await this.getUser({ userId });

    // catch cases where the calculated identity differs, such as when the github username
    // doesn't match the provided identity, and return no user in that case.
    if (user && user.identity !== identity) {
      this.monitor.warning({
        message: 'provided identity and user.identity do not match',
        providedIdentity: identity,
        userIdentity: user.identity,
      });
      return;
    }

    return user;
  }

  async expFromIdToken(idToken) {
    const [jwtError, profile] = await tryCatch(
      verifyJwtAuth0({ token: idToken, domain: this.domain, audience: this.clientId }),
    );

    if (jwtError) {
      this.monitor.debug('Error validating the idToken jwt', {
        error: jwtError,
      });

      return;
    }

    return profile.exp;
  }

  identityFromProfile(profile) {
    const userId = profile.user_id.value;
    return `${this.identityProviderId}/${encode(userId)}`;
  }

  addRoles(profile, user) {
    // see https://auth.mozilla.com/.well-known/profile.schema
    const accessInformation = profile.access_information;
    const { ldap, mozilliansorg, hris } = accessInformation;

    const groups = [
      ...(ldap && ldap.values ? Object.keys(ldap.values).map(group => `mozilla-group:${group}`) : []),
      ...(hris && hris.values ? Object.keys(hris.values).map(group => `mozilla-hris:${group}`) : []),
      ...(mozilliansorg && mozilliansorg.values ? Object.keys(mozilliansorg.values).map(group => `mozillians-group:${group}`) : []),
    ];

    user.addRole(...groups);
  }

  useStrategy(app, cfg) {
    const { credentials } = cfg.taskcluster;
    const strategyCfg = cfg.login.strategies['mozilla-auth0'];
    const loginMiddleware = login(cfg.app.publicUrl);

    if (!credentials || !credentials.clientId || !credentials.accessToken) {
      throw new Error(
        'Unable to use "mozilla-auth0" login strategy without taskcluster clientId and accessToken',
      );
    }

    const callback = '/login/mozilla-auth0/callback';

    passport.use(
      new Auth0Strategy(
        {
          domain: strategyCfg.domain,
          clientID: strategyCfg.clientId,
          clientSecret: strategyCfg.clientSecret,
          scope: 'openid profile',
          callbackURL: `${cfg.app.publicUrl}${callback}`,
          state: true,
        },
        // accessToken is the token to call Auth0 API (not needed in most cases)
        // extraParams.id_token has the JSON Web Token
        // profile has all the information from the user
        async (accessToken, refreshToken, extraParams, profile, done) => {
          const [userErr, user] = await tryCatch(this.getUser({ userId: profile.user_id }));

          if (userErr) {
            this.monitor.debug(userErr || 'Could not get user', {
              identityProviderId: this.identityProviderId,
              userId: profile.user_id,
            });
          }

          if (!user) {
            // Don't report much to the user, to avoid revealing sensitive information, although
            // it is likely in the service logs.
            return done(new WebServerError('InputError', 'Could not generate credentials for this access token'));
          }

          if (!user.identity) {
            return done(new WebServerError(
              'InputError',
              'Could not read user identity. The client is probably not properly configured.',
            ));
          }

          const exp = await this.expFromIdToken(extraParams.id_token);

          return done(null, {
            profile,
            providerExpires: new Date(exp * 1000),
            identityProviderId: 'mozilla-auth0',
            identity: user.identity,
          });
        },
      ),
    );

    // Called by the consumer
    app.get('/login/mozilla-auth0', applySecurityHeaders, passport.authenticate('auth0'));
    // Called by the provider
    app.get(
      callback,
      applySecurityHeaders,
      passport.authenticate('auth0'),
      loginMiddleware,
    );
  }
}
