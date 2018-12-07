# verdaccio-ldap

`verdaccio-ldap-extended` is a fork of [verdaccio-ldap](https://github.com/tutu-ru/verdaccio-ldap) which is a fork of `sinopia-ldap` that aims to keep backwards compatibility with `sinopia`, while keeping up with npm changes.

## Differences with parent

Differs with [verdaccio-ldap](https://github.com/tutu-ru/verdaccio-ldap) in accounting ALL of user's groups instead of only root ones: [ldapauth#a3b6310a](https://github.com/tutu-ru/node-ldapauth-fork/commit/a3b6310a9df25f6181af3a804cc984b97ec01c13)


## Installation

```sh
$ npm install verdaccio
$ npm install verdaccio-ldap
```

> A detailed example of the verdaccio-ldap plugin + OpenLDAP server packed in Docker is available [here](https://github.com/verdaccio/docker-examples/tree/master/ldap-verdaccio).

## Config

Add to your `config.yaml`:

```yaml
auth:
  'ldap-extended':
    type: ldap
    # Optional
    # If set, the outcome of plugin would consider these groups only (cut off unimportant LDAP groups)
    considerableGroups: ['groupA', 'groupB']
    client_options:
      url: "ldaps://ldap.example.com"
      # Only required if you need auth to bind
      adminDn: "cn=admin,dc=example,dc=com"
      adminPassword: "admin"
      # Search base for users
      searchBase: "ou=People,dc=example,dc=com"
      searchFilter: "(uid={{username}})"
      # If you are using groups, this is also needed
      groupDnProperty: 'cn',
      groupSearchBase: 'ou=groups,dc=myorg,dc=com',
      # If you have memberOf support on your ldap
      searchAttributes: ['*', 'memberOf']
      # Else, if you don't (use one or the other):
      # groupSearchFilter: '(memberUid={{dn}})'
      # 
      # Optional, default false.
      # If true, then up to 100 credentials at a time will be cached for 5 minutes.
      cache: false
      # Optional
      reconnect: true
```

## For plugin writers

It's called as:

```js
require('verdaccio-ldap-extended')(config, stuff)
```

Where:

 - config - module's own config
 - stuff - collection of different internal verdaccio objects
   - stuff.config - main config
   - stuff.logger - logger

This should export two functions:

 - `adduser(user, password, cb)`

   It should respond with:
    - `cb(err)` in case of an error (error will be returned to user)
    - `cb(null, false)` in case registration is disabled (next auth plugin will be executed)
    - `cb(null, true)` in case user registered successfully

   It's useful to set `err.status` property to set http status code (e.g. `err.status = 403`).

 - `authenticate(user, password, cb)`

   It should respond with:
    - `cb(err)` in case of a fatal error (error will be returned to user, keep those rare)
    - `cb(null, false)` in case user not authenticated (next auth plugin will be executed)
    - `cb(null, [groups])` in case user is authenticated

   Groups is an array of all users/usergroups this user has access to. You should probably include username itself here.
   
