from __future__ import division, print_function
import unittest
import datetime
import os

import asyncio

import base
import taskcluster.async.auth as subjectAsync


@unittest.skipIf(os.environ.get('NO_TESTS_OVER_WIRE'), "Skipping tests over wire")
class TestAuthenticationAsync(base.TCTest):

    def test_async_works_with_permanent_credentials(self):
        """we can call methods which require authentication with valid
        permacreds"""

        loop = asyncio.get_event_loop()

        async def x():
            async with subjectAsync.createSession(loop=loop) as session:
                client = subjectAsync.Auth({
                    'credentials': {
                        'clientId': 'tester',
                        'accessToken': 'no-secret',
                    },
                }, session=session)
                result = await client.testAuthenticate({
                    'clientScopes': ['test:a'],
                    'requiredScopes': ['test:a'],
                })
                self.assertEqual(result, {'scopes': ['test:a'], 'clientId': 'tester'})

        loop.run_until_complete(x())

    def test_async_works_with_temporary_credentials(self):
        """we can call methods which require authentication with temporary
        credentials generated by python client"""
        loop = asyncio.get_event_loop()

        async def x():
            async with subjectAsync.createSession(loop=loop) as session:
                tempCred = subjectAsync.createTemporaryCredentials(
                    'tester',
                    'no-secret',
                    datetime.datetime.utcnow() - datetime.timedelta(hours=10),
                    datetime.datetime.utcnow() + datetime.timedelta(hours=10),
                    ['test:xyz'],
                )
                client = subjectAsync.Auth({
                    'credentials': tempCred,
                }, session=session)

                result = client.testAuthenticate({
                    'clientScopes': ['test:*'],
                    'requiredScopes': ['test:xyz'],
                })
                self.assertEqual(result, {'scopes': ['test:xyz'], 'clientId': 'tester'})

        loop.run_until_complete
