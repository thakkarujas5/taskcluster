import React, { Component } from 'react';
import classNames from 'classnames';
import { oneOf, bool, string } from 'prop-types';
import purple from '@material-ui/core/colors/purple';
import { withStyles } from '@material-ui/core/styles';
import Label from '../Label';
import labels from '../../utils/labels';

@withStyles(theme => ({
  pending: {
    backgroundColor: `${purple[400]} !important`,
    color: `${theme.palette.getContrastText(purple[400])} !important`,
  },
}))
/**
 * A label color-coded based on known statuses.
 */
export default class StatusLabel extends Component {
  static defaultProps = {
    mini: true,
    className: null,
    variant: null,
  };

  static propTypes = {
    /**
     * A status/state string. REST-cased values (`all-completed`) and
     * GraphQL-cased values (`ALL_COMPLETED`) are both accepted.
     */
    state: string.isRequired,
    /**
     * Render the label using dense styling.
     */
    mini: bool,
    /** The CSS class name of the wrapper element */
    className: string,
    /**
     * The label color. Only use this if you are looking to override
     * the color that's already derived from the state prop.
     * */
    variant: oneOf(['default', 'info', 'success', 'error', 'warning']),
  };

  render() {
    const { classes, variant, state, mini, className, ...props } = this.props;
    // The REST API spells states `all-completed`; the labels map (and the
    // display convention this component established) uses `ALL_COMPLETED`.
    const normalized = String(state || '')
      .toUpperCase()
      .replace(/-/g, '_');

    return (
      <Label
        mini={mini}
        status={variant || labels[normalized] || 'default'}
        className={classNames(
          {
            [classes.pending]: normalized === 'PENDING',
          },
          className
        )}
        {...props}>
        {normalized || 'UNKNOWN'}
      </Label>
    );
  }
}
