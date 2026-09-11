//! Endpoint-level tests for the remote-server roster.
//!
//! The probe tests run a real upstream on `127.0.0.1:0`, so the OS picks a
//! free port and nothing can collide with a running dinotty instance.

use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};

use axum::extract::State;
use axum::http::{header, HeaderMap, StatusCode};
use axum::response::IntoResponse;
use axum::routing::get;
use axum::{Json, Router};
use serde::de::DeserializeOwned;
use serde_json::json;
use tokio::sync::RwLock;
use tokio::task::JoinHandle;

use crate::session::SessionManager;
use crate::settings::io::save_settings;
use crate::settings::{
    get_remote_servers, get_settings, probe_remote_server, put_remote_servers,
    ProbeRemoteServerRequest, ProbeRemoteServerResponse, RemoteServer, SensitiveString, Settings,
    SettingsState,
};

/// Isolates any test that reaches `save_settings` from the user's real config
/// directory. Named after this change so a stray directory is obvious.
const TEST_SUFFIX: &str = "-rsrv-be-endpoints-tests";

fn settings_state(servers: Vec<RemoteServer>) -> SettingsState {
    Arc::new(RwLock::new(Settings { remote_servers: servers, ..Settings::default() }))
}

fn stored_server(id: &str, token: Option<&str>, has_token: bool) -> RemoteServer {
    RemoteServer {
        id: id.to_string(),
        name: id.to_uppercase(),
        url: "http://192.168.1.5:58901".to_string(),
        token: token.map(|t| SensitiveString::new(t.to_string())),
        has_token,
        ..RemoteServer::default()
    }
}

/// Build an incoming roster straight from JSON, so "no `token` key" is
/// genuinely absent rather than `None` produced by a Rust constructor.
fn roster_from_json(raw: &str) -> Vec<RemoteServer> {
    serde_json::from_str(raw).unwrap()
}

async fn read_json<T: DeserializeOwned>(response: axum::response::Response) -> T {
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX).await.unwrap();
    serde_json::from_slice(&bytes).unwrap()
}

fn token_of(state: &Settings, id: &str) -> Option<String> {
    state
        .remote_servers
        .iter()
        .find(|s| s.id == id)
        .and_then(|s| s.token.as_ref().map(|t| t.expose().to_string()))
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

#[tokio::test]
async fn get_recomputes_has_token_instead_of_echoing_the_stored_flag() {
    let state = settings_state(vec![
        // Stale in both directions: the flag is a cache that a PUT can leave
        // behind, so GET has to derive it from the token itself.
        stored_server("lab", Some("s3cret"), false),
        stored_server("nobody", Some(""), true),
        stored_server("missing", None, true),
    ]);

    let response = get_remote_servers(State(state)).await;

    assert_eq!(response.status(), StatusCode::OK);
    let body: serde_json::Value = read_json(response).await;
    assert_eq!(body[0]["has_token"], true, "a stored token must win over a false flag");
    assert_eq!(body[1]["has_token"], false, "an empty token is not a configured token");
    assert_eq!(body[2]["has_token"], false);
}

/// The regression this pair of tests guards, on the read side.
///
/// `RemoteServer::token` has to serialize normally or `save_settings` cannot
/// persist it, so *nothing* about the type keeps it out of a response any more.
/// `get_remote_servers` is what does, and the assertion is on the serialized
/// bytes rather than on the shape of a deserialized `Value`, so a future
/// `skip_serializing_if` or a nested wrapper cannot quietly reintroduce it.
#[tokio::test]
async fn get_never_returns_the_token_itself() {
    let state = settings_state(vec![stored_server("lab", Some("s3cret"), true)]);

    let response = get_remote_servers(State(state)).await;
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let raw = String::from_utf8(bytes.to_vec()).unwrap();

    assert!(!raw.contains("s3cret"), "the token leaked into {raw}");
    assert!(!raw.contains(r#""token""#), "the key must be omitted, not just nulled: {raw}");
    assert!(raw.contains(r#""has_token":true"#), "the scrub must not erase the flag: {raw}");
    // The rest of the entry still has to come through.
    assert!(raw.contains(r#""id":"lab""#), "{raw}");
}

// ---------------------------------------------------------------------------
// PUT
// ---------------------------------------------------------------------------

#[tokio::test]
async fn put_keeps_clears_and_overwrites_tokens_per_id() {
    let _env = crate::test_support::EnvGuard::new(&["DINOTTY_CONFIG_SUFFIX"]);
    std::env::set_var("DINOTTY_CONFIG_SUFFIX", TEST_SUFFIX);

    let state = settings_state(vec![stored_server("lab", Some("stored"), true)]);

    // (a) The `token` key is absent - which is what a GET -> edit -> PUT round
    // trip produces, because GET scrubs the secret before answering. Keep the
    // stored one.
    let response = put_remote_servers(
        State(Arc::clone(&state)),
        Json(roster_from_json(r#"[{"id":"lab","name":"Lab","url":"http://192.168.1.5:58901"}]"#)),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    {
        let current = state.read().await;
        assert_eq!(token_of(&current, "lab").as_deref(), Some("stored"));
        assert!(current.remote_servers[0].has_token);
    }

    // (b) An explicit empty string is the "clear this token" instruction.
    let response = put_remote_servers(
        State(Arc::clone(&state)),
        Json(roster_from_json(
            r#"[{"id":"lab","name":"Lab","url":"http://192.168.1.5:58901","token":""}]"#,
        )),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    {
        let current = state.read().await;
        assert_eq!(token_of(&current, "lab").as_deref(), Some(""));
        assert!(!current.remote_servers[0].has_token, "a cleared token must not report has_token");
    }

    // (c) A supplied value overwrites.
    let response = put_remote_servers(
        State(Arc::clone(&state)),
        Json(roster_from_json(
            r#"[{"id":"lab","name":"Lab","url":"http://192.168.1.5:58901","token":"fresh"}]"#,
        )),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    let current = state.read().await;
    assert_eq!(token_of(&current, "lab").as_deref(), Some("fresh"));
    assert!(current.remote_servers[0].has_token);
}

#[tokio::test]
async fn put_replaces_the_whole_list_and_only_inherits_per_id() {
    let _env = crate::test_support::EnvGuard::new(&["DINOTTY_CONFIG_SUFFIX"]);
    std::env::set_var("DINOTTY_CONFIG_SUFFIX", TEST_SUFFIX);

    let state = settings_state(vec![
        stored_server("lab", Some("token-lab"), true),
        stored_server("attic", Some("token-attic"), true),
    ]);

    let response = put_remote_servers(
        State(Arc::clone(&state)),
        Json(roster_from_json(
            r#"[{"id":"lab","name":"Lab","url":"http://192.168.1.5:58901"},
                {"id":"new","name":"New","url":"http://192.168.1.6:58902"}]"#,
        )),
    )
    .await;

    assert_eq!(response.status(), StatusCode::OK);
    let current = state.read().await;
    assert_eq!(current.remote_servers.len(), 2, "an omitted entry is deleted, not retained");
    assert!(current.remote_servers.iter().all(|s| s.id != "attic"));
    assert_eq!(token_of(&current, "lab").as_deref(), Some("token-lab"));
    assert!(token_of(&current, "new").is_none(), "a new id has no token to inherit");
    assert!(!current.remote_servers[1].has_token);
}

#[tokio::test]
async fn put_rejects_a_url_that_is_not_a_plain_http_origin() {
    let state = settings_state(vec![]);

    for (url, expected) in [
        ("ws://192.168.1.5:58901", "scheme"),
        ("http://192.168.1.5:58901/ws", "path"),
        ("http://user:pass@192.168.1.5:58901", "credentials"),
        ("", "empty"),
    ] {
        let incoming = serde_json::json!([{ "id": "lab", "name": "Lab", "url": url }]);
        let response = put_remote_servers(
            State(Arc::clone(&state)),
            Json(serde_json::from_value(incoming).unwrap()),
        )
        .await;

        assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{url}");
        let body: serde_json::Value = read_json(response).await;
        let message = body["error"].as_str().unwrap().to_string();
        assert!(message.contains(expected), "{url} produced {message}");
        assert!(state.read().await.remote_servers.is_empty(), "{url} was stored anyway");
    }
}

#[tokio::test]
async fn put_normalizes_a_trailing_slash_to_the_bare_origin() {
    let _env = crate::test_support::EnvGuard::new(&["DINOTTY_CONFIG_SUFFIX"]);
    std::env::set_var("DINOTTY_CONFIG_SUFFIX", TEST_SUFFIX);

    let state = settings_state(vec![]);

    let response = put_remote_servers(
        State(Arc::clone(&state)),
        Json(roster_from_json(r#"[{"id":"lab","name":"Lab","url":"http://192.168.1.5:58901/"}]"#)),
    )
    .await;

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(state.read().await.remote_servers[0].url, "http://192.168.1.5:58901");
}

// ---------------------------------------------------------------------------
// probe
// ---------------------------------------------------------------------------

struct Upstream {
    origin: String,
    info_hits: Arc<AtomicUsize>,
    info_auth: Arc<Mutex<Vec<String>>>,
    task: JoinHandle<()>,
}

impl Drop for Upstream {
    fn drop(&mut self) {
        self.task.abort();
    }
}

async fn serve(app: Router) -> Upstream {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let task = tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });
    Upstream {
        origin: format!("http://{addr}"),
        info_hits: Arc::new(AtomicUsize::new(0)),
        info_auth: Arc::new(Mutex::new(Vec::new())),
        task,
    }
}

/// A stand-in for a real dinotty server: the public `/api/token-configured`
/// answered from `configured`/`is_server_binary`, and an authenticated
/// `/api/info` that records whether it was called and with what credential.
async fn spawn_dinotty(
    configured: bool,
    is_server_binary: bool,
    info: serde_json::Value,
) -> Upstream {
    let info_hits = Arc::new(AtomicUsize::new(0));
    let info_auth = Arc::new(Mutex::new(Vec::new()));

    let recorded_hits = Arc::clone(&info_hits);
    let recorded_auth = Arc::clone(&info_auth);
    let app = Router::new()
        .route(
            "/api/token-configured",
            get(move || async move {
                Json(json!({
                    "configured": configured,
                    "server_mode": is_server_binary,
                    "login_method": "token",
                }))
            }),
        )
        .route(
            "/api/info",
            get(move |headers: HeaderMap| {
                let hits = Arc::clone(&recorded_hits);
                let auth = Arc::clone(&recorded_auth);
                let info = info.clone();
                async move {
                    hits.fetch_add(1, Ordering::SeqCst);
                    let seen = headers
                        .get(header::AUTHORIZATION)
                        .and_then(|v| v.to_str().ok())
                        .unwrap_or_default()
                        .to_string();
                    auth.lock().unwrap().push(seen);
                    Json(info)
                }
            }),
        );

    let mut upstream = serve(app).await;
    upstream.info_hits = info_hits;
    upstream.info_auth = info_auth;
    upstream
}

async fn probe(url: &str, token: Option<&str>) -> ProbeRemoteServerResponse {
    let request =
        ProbeRemoteServerRequest { url: url.to_string(), token: token.map(str::to_string) };
    read_json(probe_remote_server(Json(request)).await).await
}

/// A probe that must fail before any socket is opened. The URLs below are
/// either unparseable or point at TEST-NET-1, which never answers - so an
/// implementation that reached the network would time out, not return the
/// validation message.
#[tokio::test]
async fn probe_rejects_a_bad_url_without_touching_the_network() {
    for (url, expected) in [
        ("ws://192.168.1.5:58901", "scheme"),
        ("http://192.0.2.1:80/some/path", "path"),
        ("http://user:pass@192.0.2.1", "credentials"),
        ("http://192.0.2.1/?token=x", "query"),
        ("not a url", "invalid url"),
        ("", "empty"),
    ] {
        let result = probe(url, None).await;

        assert!(!result.reachable, "{url} must not be reported reachable");
        let error = result.error.unwrap_or_default();
        assert!(error.contains(expected), "{url} produced {error}");
    }
}

#[tokio::test]
async fn probe_skips_the_authenticated_step_when_no_token_is_supplied() {
    let upstream = spawn_dinotty(true, false, json!({"version": "0.26.0"})).await;

    let result = probe(&upstream.origin, Some("")).await;

    assert!(result.reachable, "reachability is decided by the public step");
    assert!(result.token_configured);
    assert_eq!(result.server_mode.as_deref(), Some("embedded"));
    assert!(result.error.is_none(), "a reachable server has no error: {:?}", result.error);
    assert_eq!(result.settings_version, None);
    assert_eq!(
        upstream.info_hits.load(Ordering::SeqCst),
        0,
        "/api/info cannot succeed without a credential, so it must not be attempted"
    );
}

#[tokio::test]
async fn probe_authenticates_the_version_step_with_the_candidate_token() {
    let upstream = spawn_dinotty(
        true,
        true,
        json!({"lan_ip": "127.0.0.1", "port": 8999, "version": "0.26.0", "settings_version": 15}),
    )
    .await;

    let result = probe(&upstream.origin, Some("candidate")).await;

    assert!(result.reachable);
    assert!(result.token_configured);
    assert_eq!(result.server_mode.as_deref(), Some("server"));
    assert_eq!(result.settings_version, Some(15));
    assert_eq!(upstream.info_hits.load(Ordering::SeqCst), 1);
    assert_eq!(upstream.info_auth.lock().unwrap().as_slice(), ["Bearer candidate"]);
}

/// `token_configured: false` is the security-relevant answer: an upstream with
/// no token lets anyone who can reach it in as admin, so the probe has to
/// report it rather than let "reachable" imply "set up".
#[tokio::test]
async fn probe_reports_an_upstream_that_demands_no_token() {
    let upstream = spawn_dinotty(false, true, json!({"version": "0.26.0"})).await;

    let result = probe(&upstream.origin, Some("candidate")).await;

    assert!(result.reachable);
    assert!(!result.token_configured, "an unprotected upstream must be reported as such");
}

/// Today's real `/api/info` returns no `settings_version` (see `server_info`),
/// so the field stays `None` while everything else still resolves. Pinned so
/// the gap is visible in the tests rather than silently inferred.
#[tokio::test]
async fn probe_reports_no_settings_version_when_the_upstream_does_not_expose_one() {
    let upstream = spawn_dinotty(
        true,
        true,
        json!({"lan_ip": "127.0.0.1", "port": 8999, "version": "0.26.0", "repo_url": "x"}),
    )
    .await;

    let result = probe(&upstream.origin, Some("candidate")).await;

    assert!(result.reachable);
    assert!(result.token_configured);
    assert_eq!(result.settings_version, None);
}

#[tokio::test]
async fn probe_reports_a_connection_refused_target_without_a_traceback() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let origin = format!("http://{}", listener.local_addr().unwrap());
    drop(listener);

    let result = probe(&origin, None).await;

    assert!(!result.reachable);
    let error = result.error.unwrap_or_default();
    assert!(error.contains("refused"), "expected a refused-connection message, got {error}");
}

#[tokio::test]
async fn probe_refuses_to_call_a_stranger_a_dinotty_server() {
    // Port 0 gives a live listener that answers 404 for every dinotty path.
    // Reporting that as "reachable, no token configured" would tell the user
    // their unauthenticated server is fine when it is not a server at all.
    let upstream = serve(Router::new()).await;

    let result = probe(&upstream.origin, None).await;

    assert!(!result.reachable);
    let error = result.error.unwrap_or_default();
    assert!(error.contains("not a dinotty server"), "got {error}");
    assert_eq!(upstream.info_hits.load(Ordering::SeqCst), 0);
}

// ---------------------------------------------------------------------------
// persistence and the /api/settings response
// ---------------------------------------------------------------------------

/// The secret both of the tests below plant, named once so an assertion that
/// accidentally stops matching the fixture is obvious rather than passing.
const PERSISTED: &str = "a-real-looking-persisted-token";

/// The raw body of a response, so the assertions below run against the bytes a
/// client actually receives rather than a re-deserialized `Value`.
async fn read_raw(response: axum::response::Response) -> String {
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX).await.unwrap();
    String::from_utf8(bytes.to_vec()).unwrap()
}

fn state_with_persisted_token() -> SettingsState {
    settings_state(vec![stored_server("lab", Some(PERSISTED), true)])
}

/// The bug this change exists for: a token that never reaches `settings.json`
/// makes the user re-paste it after every restart.
///
/// Asserted through `load_settings` and not merely by inspecting the file, so
/// the whole round trip is covered. Making the token survive
/// `to_string_pretty` without making it survive `from_str` would still lose it.
#[tokio::test]
async fn save_settings_writes_the_token_and_load_settings_reads_it_back() {
    // The config dir is process-global state, so this test has to own the
    // suffix for as long as it reads it - `EnvGuard` also serializes it against
    // every other test that touches the same variable.
    let _env = crate::test_support::EnvGuard::new(&["DINOTTY_CONFIG_SUFFIX"]);
    std::env::set_var("DINOTTY_CONFIG_SUFFIX", "-rsrv-fix-secrets-save");

    let stored = state_with_persisted_token().read().await.clone();
    save_settings(&stored).unwrap();

    let on_disk =
        std::fs::read_to_string(crate::settings::config_dir().join("settings.json")).unwrap();
    assert!(
        on_disk.contains(PERSISTED),
        "the token must be written to settings.json, got: {on_disk}"
    );

    let reloaded = crate::settings::load_settings();
    assert_eq!(token_of(&reloaded, "lab").as_deref(), Some(PERSISTED));
    assert!(reloaded.remote_servers[0].has_token);
}

/// The other half of the same fix: the token is on disk *and* nowhere in the
/// settings response. `get_settings` is the only handler that returns a whole
/// `Settings`, and it is the one that has to scrub.
#[tokio::test]
async fn get_settings_response_never_contains_the_token() {
    let _env = crate::test_support::EnvGuard::new(&["DINOTTY_CONFIG_SUFFIX"]);
    std::env::set_var("DINOTTY_CONFIG_SUFFIX", "-rsrv-fix-secrets-get");

    // `get_settings` extracts the manager alongside the settings state.
    let manager = Arc::new(SessionManager::new());
    let response = get_settings(State((manager, state_with_persisted_token()))).await;

    let raw = read_raw(response.into_response()).await;
    assert!(!raw.contains(PERSISTED), "the token leaked into {raw}");

    // The key check has to be scoped to the roster entry: the rest of this body
    // legitimately contains the *word* token (`"login_method":"token"`), so a
    // whole-body substring test would fail for reasons that have nothing to do
    // with the secret.
    let body: serde_json::Value = serde_json::from_str(&raw).unwrap();
    let entry = &body["remote_servers"][0];
    assert_eq!(entry["id"], "lab");
    assert!(entry.get("token").is_none(), "the key must be omitted, not just nulled: {entry}");
    assert_eq!(entry["has_token"], true, "the flag must survive the scrub: {entry}");
}
