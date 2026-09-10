#![allow(clippy::unwrap_used, clippy::expect_used)]
//! Dedicated endpoints for the remote-server roster.
//!
//! The list is *also* reachable through `GET/PUT /api/settings`, but these
//! exist so the roster can be read and written without round-tripping the
//! whole settings object. `GET` recomputes `has_token` and never returns the
//! token itself; `PUT` is an atomic full replace with per-`id` token
//! inheritance (see [`crate::settings::merge_remote_server_tokens`]).
//!
//! **This module is a stub.** Every handler body returns 501.

use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};

use crate::settings::{types::RemoteServer, SettingsState};

fn not_implemented() -> Response {
    (StatusCode::NOT_IMPLEMENTED, "not implemented yet").into_response()
}

/// Request body for [`probe_remote_server`].
///
/// The probe runs hub-side rather than from the browser, so the target carries
/// no CORS or origin problem in any client mode. `token` is the candidate
/// credential to test; it is optional so the user can probe an unauthenticated
/// target before deciding whether one is needed.
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct ProbeRemoteServerRequest {
    pub url: String,
    #[serde(default, skip_serializing)]
    pub token: Option<String>,
}

/// Result of [`probe_remote_server`].
///
/// `token_configured` must drive a UI warning, not just a status dot: an
/// upstream with an empty token lets *anyone* who can reach it in as admin
/// (`auth_middleware` returns early when the token is empty), so "reachable"
/// must never be presented as "set up correctly".
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct ProbeRemoteServerResponse {
    pub reachable: bool,
    pub token_configured: bool,
    /// "server" or "embedded" - which binary answered.
    pub server_mode: Option<String>,
    /// Upstream's `settings_version`, for the version-compat warning.
    pub settings_version: Option<u32>,
    /// Human-readable failure reason when `reachable` is false.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// `GET /api/remote-servers` - return the roster.
///
/// B2 fills this body. Recompute `has_token` for every entry before returning;
/// the stored flag can be stale relative to the token.
pub async fn get_remote_servers(State(_settings): State<SettingsState>) -> Response {
    not_implemented()
}

/// `PUT /api/remote-servers` - atomically replace the roster.
///
/// B2 fills this body: merge the incoming list with the stored one via
/// [`crate::settings::merge_remote_server_tokens`], then persist with
/// `save_settings` and swap in the new state, mirroring `put_settings`.
pub async fn put_remote_servers(
    State(_settings): State<SettingsState>,
    Json(_servers): Json<Vec<RemoteServer>>,
) -> Response {
    not_implemented()
}

/// `POST /api/remote-servers/probe` - reachability and version check.
///
/// B2 fills this body. The request must carry a candidate `url` (and token)
/// rather than a roster id, so the "Test connection" button can validate an
/// entry the user has not saved yet.
pub async fn probe_remote_server(Json(_req): Json<ProbeRemoteServerRequest>) -> Response {
    not_implemented()
}
