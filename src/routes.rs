use axum::{
    extract::State,
    http::{header, HeaderValue},
    response::{Html, IntoResponse},
};

use crate::{AppState, StaticFiles};

pub async fn index(State(state): State<AppState>) -> impl IntoResponse {
    let content = StaticFiles::get("index.html")
        .expect("index.html must exist in frontend/dist/");
    let html = String::from_utf8_lossy(&content.data);
    let tag = format!(
        "<meta name=\"auth-token\" content=\"{}\">\n</head>",
        &*state.auth_token
    );
    let html = html.replace("</head>", &tag);
    (
        [(header::CACHE_CONTROL, HeaderValue::from_static("no-store"))],
        Html(html),
    )
}
