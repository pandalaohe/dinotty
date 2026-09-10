#![allow(clippy::unwrap_used, clippy::expect_used)]
//! Hub relay: re-serve a *remote* dinotty server's HTTP and WebSocket traffic
//! under this hub's own origin, at `/__srv/<server id>/…`.
//!
//! The frontend never talks to a remote server's origin directly. It keeps
//! talking to the origin that served the page (the hub) and the hub forwards,
//! injecting the upstream `Authorization` header from its own roster. That is
//! what makes the switch purely a transport concern: no CORS allowlisting on
//! either side, no remote-side auth change, and the upstream token never
//! reaches JavaScript.
//!
//! **This module is a stub.** Every handler body returns 501. The gate
//! predicate, the forwarding, and the header injection land separately.

use axum::{
    extract::{ConnectInfo, Path, Request, State},
    http::{header, StatusCode},
    response::{IntoResponse, Response},
};
use std::net::SocketAddr;

use crate::settings::SettingsState;

/// Reserved path prefix for relayed requests: `/__srv/<server id>/<rest>`.
///
/// Must stay in sync with the two auth early-return lists
/// (`crate::auth::auth_middleware` and the Tauri router's copy of the route
/// table) - the relay handler owns its own gate, so the global middleware has
/// to let these paths through untouched.
pub const RELAY_PREFIX: &str = "/__srv";

/// Anti-CSRF header required on every non-idempotent relayed request.
///
/// The relay holds *another server's credentials*, so it must not be drivable
/// by a page the user merely happens to have open. A cross-origin `no-cors`
/// request cannot set a custom header (doing so would make it preflighted, and
/// `allowed_origins` blocks the preflight), while a same-origin request can.
/// This is strictly stronger than the `/preview/` rules, which tolerate
/// header-less requests for `<img>`-style subresources.
pub const RELAY_CSRF_HEADER: &str = "x-dinotty-relay";

fn not_implemented() -> Response {
    (StatusCode::NOT_IMPLEMENTED, "relay not implemented yet").into_response()
}

/// Split `/__srv/<id>/<rest>` into its server id and the remainder.
///
/// Returns `None` when the path is not under [`RELAY_PREFIX`] or carries an
/// empty id. `rest` is returned without a leading slash and is `""` for a
/// request to the server root.
#[must_use]
pub fn parse_relay_path(path: &str) -> Option<(&str, &str)> {
    let after = path.strip_prefix(RELAY_PREFIX)?.strip_prefix('/')?;
    if after.is_empty() {
        return None;
    }
    match after.split_once('/') {
        Some((id, rest)) if !id.is_empty() => Some((id, rest)),
        Some(_) => None,
        None => Some((after, "")),
    }
}

/// Forward a non-WebSocket relayed request to the roster server named in the
/// path.
///
/// B1 fills this body. It must:
/// - reject unless `(loopback || has_valid_auth) && !is_cross_site_browser_request
///   && target ∈ roster` (the gate lives here and nowhere else);
/// - require [`RELAY_CSRF_HEADER`] on non-idempotent methods;
/// - take the upstream origin from the roster, never from the request;
/// - drop the client's own `Authorization` and inject the roster token;
/// - refuse to relay `/api/auth*`, `/api/token*`, `/api/auto-token` and
///   `/api/token-configured` - those must always resolve against the *hub*, or
///   a login would set its cookie on the wrong origin.
pub async fn relay_http_handler(
    Path(_id): Path<String>,
    State(_settings): State<SettingsState>,
    ConnectInfo(_addr): ConnectInfo<SocketAddr>,
    _req: Request,
) -> Response {
    not_implemented()
}

/// Forward a relayed WebSocket upgrade.
///
/// B1 fills this body. Reuse [`crate::proxy::proxy_websocket`], passing the
/// roster token as its `inject_headers` argument so the upstream sees the
/// credential the browser cannot set.
pub async fn relay_ws_handler(
    Path(_id): Path<String>,
    State(_settings): State<SettingsState>,
    ConnectInfo(_addr): ConnectInfo<SocketAddr>,
    _req: Request,
) -> Response {
    not_implemented()
}

/// Single entry point for all three `/__srv` route shapes
/// (`/:id`, `/:id/`, `/:id/*rest`).
///
/// axum dispatches on a route pattern, but the same relay has to serve the
/// server root and every path below it, and only one of those can extract the
/// id positionally. Parsing the path here keeps one implementation for all
/// three and mirrors how [`crate::proxy::proxy_handler_wildcard`] already
/// handles its own wildcard.
///
/// The WebSocket/HTTP split is a header check, so one handler covers both.
pub async fn relay_dispatch_handler(
    State(settings): State<SettingsState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    req: Request,
) -> Response {
    let Some((id, _rest)) = parse_relay_path(req.uri().path()) else {
        return (StatusCode::BAD_REQUEST, "malformed relay path").into_response();
    };
    let is_websocket = req
        .headers()
        .get(header::UPGRADE)
        .and_then(|v| v.to_str().ok())
        .is_some_and(|v| v.eq_ignore_ascii_case("websocket"));

    if is_websocket {
        relay_ws_handler(Path(id.to_string()), State(settings), ConnectInfo(addr), req).await
    } else {
        relay_http_handler(Path(id.to_string()), State(settings), ConnectInfo(addr), req).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_id_and_remainder() {
        assert_eq!(parse_relay_path("/__srv/abc"), Some(("abc", "")));
        assert_eq!(parse_relay_path("/__srv/abc/"), Some(("abc", "")));
        assert_eq!(parse_relay_path("/__srv/abc/api/info"), Some(("abc", "api/info")));
        assert_eq!(parse_relay_path("/__srv/abc/ws/sync"), Some(("abc", "ws/sync")));
    }

    #[test]
    fn rejects_paths_outside_the_prefix_or_without_an_id() {
        assert_eq!(parse_relay_path("/__srv"), None);
        assert_eq!(parse_relay_path("/__srv/"), None);
        assert_eq!(parse_relay_path("/preview/8999/api/info"), None);
        assert_eq!(parse_relay_path("/api/settings"), None);
        // A sibling that merely shares the prefix must not be relayed.
        assert_eq!(parse_relay_path("/__srvx/abc"), None);
    }

    #[test]
    fn the_stub_answers_501_rather_than_silently_succeeding() {
        let resp = not_implemented();
        assert_eq!(resp.status(), StatusCode::NOT_IMPLEMENTED);
    }

    /// The dispatcher has to accept all three route shapes, and axum's `Path`
    /// extractor is the part that would break first: the wildcard route
    /// declares two params, so a single-param `Path<String>` may or may not
    /// deserialize. `Router::oneshot` is the only way to find out, since the
    /// failure mode is a runtime 500 rather than a compile error.
    #[tokio::test]
    async fn every_relay_route_shape_dispatches() {
        use axum::body::Body;
        use axum::routing::any;
        use axum::Router;
        use tower::ServiceExt;

        let state: crate::settings::SettingsState =
            std::sync::Arc::new(tokio::sync::RwLock::new(crate::settings::Settings::default()));
        let app = Router::new()
            .route("/__srv/:id", any(relay_dispatch_handler))
            .route("/__srv/:id/", any(relay_dispatch_handler))
            .route("/__srv/:id/*rest", any(relay_dispatch_handler))
            .with_state(state);

        for path in ["/__srv/abc", "/__srv/abc/", "/__srv/abc/api/info", "/__srv/abc/ws/sync"] {
            let mut req = axum::http::Request::builder().uri(path).body(Body::empty()).unwrap();
            // `ConnectInfo` is normally inserted by `into_make_service_with_connect_info`;
            // without it the extractor rejects and we would be testing a 500, not the stub.
            req.extensions_mut()
                .insert(ConnectInfo("127.0.0.1:5000".parse::<SocketAddr>().unwrap()));
            let resp = app.clone().oneshot(req).await.unwrap();
            assert_eq!(
                resp.status(),
                StatusCode::NOT_IMPLEMENTED,
                "{path} did not reach the relay dispatcher"
            );
        }
    }
}
