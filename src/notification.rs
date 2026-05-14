use axum::{extract::State, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tokio::sync::broadcast;

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum NotificationEvent {
    Bell {
        pane_id: String,
    },
    Notify {
        pane_id: String,
        title: Option<String>,
        body: String,
        notification_type: String,
    },
}

pub struct NotificationBroadcast {
    tx: broadcast::Sender<NotificationEvent>,
    bell_debounce: Mutex<HashMap<String, Instant>>,
    debounce_ms: Mutex<u32>,
}

impl NotificationBroadcast {
    pub fn new() -> Self {
        let (tx, _) = broadcast::channel(256);
        Self {
            tx,
            bell_debounce: Mutex::new(HashMap::new()),
            debounce_ms: Mutex::new(300),
        }
    }

    pub fn set_debounce_ms(&self, ms: u32) {
        *self.debounce_ms.lock().unwrap() = ms;
    }

    pub fn subscribe(&self) -> broadcast::Receiver<NotificationEvent> {
        self.tx.subscribe()
    }

    pub fn send_bell(&self, pane_id: String) {
        let debounce_ms = *self.debounce_ms.lock().unwrap();
        let mut map = self.bell_debounce.lock().unwrap();
        let now = Instant::now();
        if let Some(last) = map.get(&pane_id) {
            if now.duration_since(*last).as_millis() < debounce_ms as u128 {
                return;
            }
        }
        map.retain(|_, last| now.duration_since(*last).as_secs() < 60);
        map.insert(pane_id.clone(), now);
        drop(map);
        let _ = self.tx.send(NotificationEvent::Bell { pane_id });
    }

    pub fn send_notify(
        &self,
        pane_id: String,
        title: Option<String>,
        body: String,
        notification_type: String,
    ) {
        let _ = self.tx.send(NotificationEvent::Notify {
            pane_id,
            title,
            body,
            notification_type,
        });
    }
}


#[derive(Deserialize)]
pub struct NotifyRequest {
    pub pane_id: Option<String>,
    pub title: Option<String>,
    pub body: String,
    #[serde(default = "default_notify_type")]
    pub notification_type: String,
}

fn default_notify_type() -> String {
    "info".to_string()
}

pub async fn post_notify(
    State(notifier): State<Arc<NotificationBroadcast>>,
    Json(req): Json<NotifyRequest>,
) -> impl IntoResponse {
    let pane_id = req.pane_id.unwrap_or_default();
    notifier.send_notify(pane_id, req.title, req.body, req.notification_type);
    Json(serde_json::json!({ "ok": true }))
}
