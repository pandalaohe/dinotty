use serde::{Deserialize, Serialize};

use super::ssh::SensitiveString;

/// A dinotty server this hub can relay to.
///
/// The roster lives in the hub's `settings.json`; `id` is the stable key the
/// relay prefix (`/__srv/<id>/…`) addresses. `url` is normalized to an origin
/// (no `user:pass@`, no `ws://`, no path) - see the relay gate in
/// `crate::proxy::relay`.
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct RemoteServer {
    pub id: String,
    pub name: String,
    pub url: String,
    /// Write-only. Three states, which is why this is not a bare
    /// `SensitiveString`:
    ///
    /// | PUT payload   | deserialized  | meaning                       |
    /// |---------------|---------------|-------------------------------|
    /// | key absent    | `None`        | keep the token stored for `id` |
    /// | `""`          | `Some("")`    | clear it                      |
    /// | `"abc"`       | `Some("abc")` | set it                        |
    ///
    /// `SensitiveString`'s own `Deserialize` is an unconditional
    /// `String::deserialize`, so `""` would round-trip as an empty string
    /// rather than as "absent" - and a full-object PUT from the frontend would
    /// then silently wipe every configured token. `skip_serializing` keeps GET
    /// from ever echoing the secret; clients read [`Self::has_token`] instead.
    ///
    /// Note on `"token": null`: serde's `Option` consumes an explicit `null` as
    /// `None`, so it means **keep**, not clear. Only `""` clears. That is the
    /// safe direction - a client that hand-writes `null` preserves a working
    /// credential instead of destroying it - and it is pinned by
    /// `explicit_null_means_keep_not_clear` below. Clients that serialize this
    /// struct never send `null` anyway: `skip_serializing` omits the key.
    #[serde(default, skip_serializing)]
    pub token: Option<SensitiveString>,
    #[serde(default)]
    pub group: Option<String>,
    #[serde(default)]
    pub last_seen_version: Option<String>,
    /// Derived from `token` - never trusted from the client. GET handlers
    /// recompute it; PUT handlers recompute it after the token merge.
    #[serde(default)]
    pub has_token: bool,
}

impl RemoteServer {
    /// Recompute the derived `has_token` flag from the token itself.
    pub fn refresh_has_token(&mut self) {
        self.has_token = self.token.as_ref().is_some_and(|t| !t.is_empty());
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn absent_token_key_deserializes_to_none() {
        let srv: RemoteServer =
            serde_json::from_str(r#"{"id":"a","name":"A","url":"http://192.168.1.5:58901"}"#)
                .unwrap();
        assert!(srv.token.is_none());
        assert!(!srv.has_token);
    }

    #[test]
    fn empty_string_token_deserializes_to_some_empty() {
        let srv: RemoteServer =
            serde_json::from_str(r#"{"id":"a","name":"A","url":"http://h:1","token":""}"#).unwrap();
        assert_eq!(srv.token.as_ref().map(SensitiveString::expose), Some(""));
    }

    /// serde's `Option` consumes an explicit `null` as `None`, *not* as
    /// `Some("")`. So `null` means "keep", while `""` means "clear" - the safe
    /// direction, but it is a deviation from the design doc's tri-state table
    /// and would be easy to "fix" into a credential-destroying regression.
    #[test]
    fn explicit_null_means_keep_not_clear() {
        let srv: RemoteServer =
            serde_json::from_str(r#"{"id":"a","name":"A","url":"http://h:1","token":null}"#)
                .unwrap();
        assert!(srv.token.is_none());
    }

    #[test]
    fn token_is_never_serialized() {
        let mut srv = RemoteServer {
            id: "a".into(),
            name: "A".into(),
            url: "http://h:1".into(),
            token: Some(SensitiveString::new("secret".into())),
            ..RemoteServer::default()
        };
        srv.refresh_has_token();
        let json = serde_json::to_string(&srv).unwrap();
        assert!(!json.contains("secret"), "token leaked into {json}");
        assert!(!json.contains(r#""token""#), "the key itself must be omitted, not just the value");
        assert!(json.contains(r#""has_token":true"#));
    }

    #[test]
    fn has_token_ignores_an_empty_token() {
        let mut srv = RemoteServer {
            token: Some(SensitiveString::new(String::new())),
            has_token: true, // stale client-supplied value
            ..RemoteServer::default()
        };
        srv.refresh_has_token();
        assert!(!srv.has_token);
    }
}
