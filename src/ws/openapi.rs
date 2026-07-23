use std::sync::Arc;

use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};

use crate::session::SessionManager;
use crate::settings::SettingsState;

use super::types::InputRequest;

/// # Panics
/// Panics if the internal mutex is poisoned.
pub async fn post_input(
    State((manager, settings)): State<(Arc<SessionManager>, SettingsState)>,
    Json(req): Json<InputRequest>,
) -> impl IntoResponse {
    let s = settings.read().await;
    if !s.open_api.enabled {
        return (
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({ "error": "open_api is disabled" })),
        );
    }
    drop(s);

    let pane_id = req.pane_id.clone().or_else(|| {
        manager.active_pane_id.lock().unwrap_or_else(std::sync::PoisonError::into_inner).clone()
    });

    let pane_id = match pane_id {
        Some(id) if manager.sessions.contains_key(&id) => id,
        _ => {
            // Fall back to first available session
            match manager.sessions.iter().next() {
                Some(entry) => entry.key().clone(),
                None => {
                    return (
                        StatusCode::BAD_REQUEST,
                        Json(serde_json::json!({ "error": "no active pane" })),
                    )
                }
            }
        }
    };

    match manager.sessions.get(&pane_id) {
        Some(session) => match session.enqueue_input(req.data) {
            Ok(()) => (StatusCode::OK, Json(serde_json::json!({ "ok": true }))),
            Err(error) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "ok": false, "error": error.to_string() })),
            ),
        },
        None => (StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "pane not found" }))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::session::{CwdState, InputState, Session, SessionBackend, SessionStatus, SyncState};
    use crate::settings::Settings;
    use crate::vt_screen::VirtualScreen;
    use axum::body::to_bytes;
    use std::path::PathBuf;
    use std::sync::atomic::{AtomicBool, AtomicU64};
    use std::sync::Mutex;
    use tokio::sync::{mpsc, watch, RwLock};

    fn stub_session(input_state: InputState) -> Arc<Session> {
        let (resize_tx, _resize_rx) = watch::channel(None);
        let (output_tx, output_rx) = mpsc::unbounded_channel();
        Arc::new(Session {
            backend: tokio::sync::Mutex::new(SessionBackend::Exited),
            ssh_params: None,
            screen: Mutex::new(VirtualScreen::new(80, 24)),
            clients: Mutex::new(Vec::new()),
            next_client_id: AtomicU64::new(1),
            tauri_client_id: Mutex::new(None),
            input_state: Mutex::new(input_state),
            status: Mutex::new(SessionStatus::Connected),
            is_connected: AtomicBool::new(true),
            size: Mutex::new((80, 24)),
            exited: Mutex::new(false),
            shell_type: "test".to_string(),
            tauri_on_exit: Mutex::new(None),
            cwd_state: Mutex::new(CwdState { cwd: PathBuf::from("/"), sniff_buf: Vec::new() }),
            sync: Mutex::new(SyncState::default()),
            sync_disable_hook: Mutex::new(None),
            resize_tx,
            ssh_cmd_tx: Mutex::new(None),
            ssh_handle: tokio::sync::Mutex::new(None),
            sftp_session: Mutex::new(None),
            remote_home: Mutex::new(None),
            remote_user: Mutex::new(None),
            output_tx,
            output_rx: Mutex::new(Some(output_rx)),
            pending_results: Mutex::new(Vec::new()),
        })
    }

    fn enabled_settings() -> SettingsState {
        let mut settings = Settings::default();
        settings.open_api.enabled = true;
        Arc::new(RwLock::new(settings))
    }

    #[tokio::test]
    async fn post_input_delivers_through_session_queue() {
        let manager = Arc::new(SessionManager::new());
        let (input_tx, mut input_rx) = mpsc::unbounded_channel();
        assert!(manager
            .insert_session("api-pane".to_string(), stub_session(InputState::Running(input_tx))));

        let response = post_input(
            State((manager, enabled_settings())),
            Json(InputRequest {
                pane_id: Some("api-pane".to_string()),
                data: "queued".to_string(),
            }),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(input_rx.try_recv().unwrap(), "queued");
    }

    #[tokio::test]
    async fn post_input_returns_500_json_when_dispatcher_rejects() {
        let manager = Arc::new(SessionManager::new());
        assert!(manager.insert_session("closed-pane".to_string(), stub_session(InputState::Closed)));

        let response = post_input(
            State((manager, enabled_settings())),
            Json(InputRequest {
                pane_id: Some("closed-pane".to_string()),
                data: "rejected".to_string(),
            }),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["ok"], false);
        assert!(json["error"].as_str().is_some_and(|error| !error.is_empty()));
    }
}
