use axum::{
    body::Body,
    extract::{Path, Query, Request},
    http::{header, StatusCode},
    response::{IntoResponse, Response},
};
use bytes::Bytes;
use futures_util::StreamExt;
use lol_html::{element, HtmlRewriter, Settings};
use reqwest::Client;
use serde::Deserialize;
use std::net::IpAddr;
use std::sync::LazyLock;
use std::time::Duration;

static BASE_TAG_RE: LazyLock<regex::Regex> =
    LazyLock::new(|| regex::Regex::new(r"(?i)<base\s[^>]*>").unwrap());

static CSS_URL_RE: LazyLock<regex::Regex> = LazyLock::new(|| {
    regex::Regex::new(r#"(?i)url\(\s*(['"]?)([^)'"]+)['"]?\s*\)"#).unwrap()
});

static HTTP_CLIENT: LazyLock<Client> = LazyLock::new(|| {
    Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .no_proxy()
        .gzip(true)
        .brotli(true)
        .pool_idle_timeout(Duration::from_secs(90))
        .pool_max_idle_per_host(10)
        .connect_timeout(Duration::from_secs(5))
        .timeout(Duration::from_secs(30))
        .build()
        .unwrap()
});

static HTTP_CLIENT_FOLLOW_REDIRECTS: LazyLock<Client> = LazyLock::new(|| {
    Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .pool_idle_timeout(Duration::from_secs(90))
        .pool_max_idle_per_host(10)
        .connect_timeout(Duration::from_secs(5))
        .timeout(Duration::from_secs(30))
        .gzip(true)
        .brotli(true)
        .build()
        .unwrap()
});

const INJECT_SCRIPT_INTERNAL: &str = r#"<script>(function(){
window.parent.postMessage({type:'preview-ready'},'*');
window.addEventListener('error',function(e){
window.parent.postMessage({type:'preview-error',message:e.message,source:e.filename,line:e.lineno},'*');
});
var defined=window.__xterm_proxy_port;
if(!defined){
var PORT=document.currentScript.getAttribute('data-port');
window.__xterm_proxy_port=PORT;
function notifyNav(){
var m=location.pathname.match(/^\/preview\/(\d+)(\/.*)?$/);
if(!m)return;
var pt=m[1],path=m[2]||'/';
var real='http://127.0.0.1:'+pt+path+location.search+location.hash;
window.parent.postMessage({type:'proxy-navigate',url:real},'*');
}
notifyNav();
function rewrite(u){
try{var p=new URL(u,location.href);
var h=p.hostname;
if(h==='127.0.0.1'||h==='localhost'||h==='0.0.0.0'){
var pt=p.port||'80';
return'/preview/'+pt+p.pathname+p.search+p.hash;}
}catch(e){}
return null;
}
document.addEventListener('click',function(e){
var a=e.target.closest('a');
if(!a||!a.href)return;
var r=rewrite(a.href);
if(r){e.preventDefault();location.href=r;}
},true);
document.addEventListener('submit',function(e){
var f=e.target;if(!f||!f.action)return;
var r=rewrite(f.action);
if(r){f.action=r;}
},true);
var _open=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(m,u){
var r=rewrite(u);
return _open.apply(this,[m,r||u].concat([].slice.call(arguments,2)));
};
var _fetch=window.fetch;
window.fetch=function(u,o){
if(typeof u==='string'){var r=rewrite(u);if(r)u=r;}
else if(u instanceof Request){var r2=rewrite(u.url);if(r2)u=new Request(r2,u);}
return _fetch.call(this,u,o);
};
var _pushState=history.pushState;
history.pushState=function(){var r=_pushState.apply(this,arguments);notifyNav();return r;};
var _replaceState=history.replaceState;
history.replaceState=function(){var r=_replaceState.apply(this,arguments);notifyNav();return r;};
window.addEventListener('popstate',function(){notifyNav();});
}
})();</script>"#;

const INJECT_SCRIPT_EXTERNAL: &str = r#"<script>(function(){
window.parent.postMessage({type:'preview-ready'},'*');
window.addEventListener('error',function(e){
window.parent.postMessage({type:'preview-error',message:e.message,source:e.filename,line:e.lineno},'*');
});
if(window.__xterm_ext_proxy)return;
window.__xterm_ext_proxy=true;
var BASE=document.currentScript.getAttribute('data-base-url')||'';
function notifyNav(url){
window.parent.postMessage({type:'proxy-navigate',url:url},'*');
}
function realUrl(){
var h=location.href;
var m=h.match(/[?&]url=([^&]+)/);
if(m)try{return decodeURIComponent(m[1]);}catch(e){}
if(BASE)return BASE;
return h;
}
notifyNav(realUrl());
function proxyUrl(u){
try{
if(!u||u.startsWith('data:')||u.startsWith('blob:')||u.startsWith('javascript:')||u.startsWith('#'))return null;
var abs;
if(/^https?:\/\//i.test(u)){abs=u;}
else if(/^\/\//.test(u)){abs='https:'+u;}
else if(BASE){abs=new URL(u,BASE).href;}
else{return null;}
if(abs.indexOf('/api/proxy')!==-1)return null;
return'/api/proxy?url='+encodeURIComponent(abs);
}catch(e){return null;}
}
function extractReal(u){
var m=u.match(/\/api\/proxy\?url=([^&]+)/);
if(m)try{return decodeURIComponent(m[1]);}catch(e){}
return null;
}
document.addEventListener('click',function(e){
var a=e.target.closest?e.target.closest('a'):null;
if(!a||!a.href)return;
var href=a.href;
var real=extractReal(href);
if(real){
e.preventDefault();
notifyNav(real);
location.href=href;
return;
}
var t=a.getAttribute('target');
if(t==='_blank'){
var r=proxyUrl(href);
if(r){e.preventDefault();window.open(r,'_blank');}
return;
}
var r2=proxyUrl(href);
if(r2){e.preventDefault();notifyNav(href);location.href=r2;}
},true);
document.addEventListener('submit',function(e){
var f=e.target;if(!f)return;
var action=f.getAttribute('action')||f.action||'';
var realAction=extractReal(action)||action;
var target=proxyUrl(realAction);
if(!target&&action.indexOf('/api/proxy')!==-1){
target=action;
}
if(!target)return;
if((f.method||'GET').toUpperCase()==='GET'){
e.preventDefault();
var fd=new FormData(f);
var params=new URLSearchParams(fd).toString();
var baseReal=extractReal(target)||realAction;
var sep=baseReal.indexOf('?')!==-1?'&':'?';
var fullUrl=baseReal+sep+params;
var proxied='/api/proxy?url='+encodeURIComponent(fullUrl);
notifyNav(fullUrl);
location.href=proxied;
}else{
f.action=target;
}
},true);
var _open=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(m,u){
var r=proxyUrl(u);
return _open.apply(this,[m,r||u].concat([].slice.call(arguments,2)));
};
var _fetch=window.fetch;
window.fetch=function(u,o){
if(typeof u==='string'){var r=proxyUrl(u);if(r)u=r;}
else if(u instanceof Request){var r2=proxyUrl(u.url);if(r2)u=new Request(r2,u);}
return _fetch.call(this,u,o);
};
var _wopen=window.open;
window.open=function(u,n,f){
if(typeof u==='string'){var r=proxyUrl(u);if(r)u=r;}
return _wopen.call(this,u,n,f);
};
var _pushState=history.pushState;
history.pushState=function(){
var r=_pushState.apply(this,arguments);
notifyNav(realUrl());
return r;
};
var _replaceState=history.replaceState;
history.replaceState=function(){
var r=_replaceState.apply(this,arguments);
notifyNav(realUrl());
return r;
};
window.addEventListener('popstate',function(){notifyNav(realUrl());});
})();</script>"#;

fn make_base_tag(port: u16) -> String {
    format!("<base href=\"/preview/{}/\">", port)
}

pub async fn proxy_handler_root(
    Path(port): Path<u16>,
    req: Request,
) -> impl IntoResponse {
    proxy_internal(port, String::new(), req).await
}

pub async fn proxy_handler_wildcard(
    req: Request,
) -> impl IntoResponse {
    let uri_path = req.uri().path().to_string();
    let after = uri_path.strip_prefix("/preview/").unwrap_or("");
    let (port_str, path) = match after.find('/') {
        Some(i) => (&after[..i], after[i..].to_string()),
        None => (after, String::new()),
    };
    let port: u16 = match port_str.parse() {
        Ok(p) => p,
        Err(_) => {
            return Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body(Body::from("Invalid port number"))
                .unwrap();
        }
    };
    proxy_internal(port, path, req).await
}

async fn proxy_internal(port: u16, path: String, req: Request) -> Response {
    if port < 1024 {
        return Response::builder()
            .status(StatusCode::BAD_REQUEST)
            .body(Body::from("Invalid port (must be 1024-65535)"))
            .unwrap();
    }

    let query = req.uri().query().map(|q| format!("?{}", q)).unwrap_or_default();
    let path_part = if path.is_empty() || path == "/" {
        String::from("/")
    } else if path.starts_with('/') {
        path.clone()
    } else {
        format!("/{}", path)
    };
    let target_url = format!("http://127.0.0.1:{}{}{}", port, path_part, query);

    let (method, headers, body_bytes) = match extract_request(req).await {
        Ok(v) => v,
        Err(r) => return r,
    };

    let mut proxy_req = HTTP_CLIENT.request(
        reqwest::Method::from_bytes(method.as_str().as_bytes()).unwrap(),
        &target_url,
    );

    for (name, value) in headers.iter() {
        let n = name.as_str();
        if n == "host" || n == "connection" || n == "upgrade" || n == "accept-encoding" {
            continue;
        }
        if let Ok(v) = value.to_str() {
            proxy_req = proxy_req.header(n, v);
        }
    }

    if !body_bytes.is_empty() {
        proxy_req = proxy_req.body(body_bytes);
    }

    let upstream_resp = match proxy_req.send().await {
        Ok(r) => r,
        Err(e) => {
            let msg = if e.is_connect() {
                format!("Cannot connect to localhost:{} — is the server running?", port)
            } else {
                format!("Proxy error: {}", e)
            };
            return Response::builder()
                .status(StatusCode::BAD_GATEWAY)
                .header(header::CONTENT_TYPE, "text/plain; charset=utf-8")
                .body(Body::from(msg))
                .unwrap();
        }
    };

    let inject_base = make_base_tag(port);
    let inject_script = INJECT_SCRIPT_INTERNAL.replace(
        "document.currentScript.getAttribute('data-port')",
        &format!("'{}'", port),
    );
    build_proxied_response(upstream_resp, &inject_base, &inject_script, Some(RewriteMode::Internal(port))).await
}

#[derive(Deserialize)]
pub struct ExternalProxyParams {
    pub url: String,
}

fn is_private_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            v4.is_loopback()
                || v4.is_private()
                || v4.is_link_local()
                || v4.is_broadcast()
                || v4.is_unspecified()
                || v4.octets()[0] == 100 && v4.octets()[1] >= 64 && v4.octets()[1] <= 127 // CGN
                || v4.octets() == [169, 254, 169, 254] // metadata
        }
        IpAddr::V6(v6) => v6.is_loopback() || v6.is_unspecified(),
    }
}

async fn check_host_not_private(parsed: &reqwest::Url, msg: &str) -> Result<(), Response> {
    let Some(host) = parsed.host_str() else {
        return Ok(());
    };
    if let Ok(ip) = host.parse::<IpAddr>() {
        if is_private_ip(ip) {
            return Err(Response::builder()
                .status(StatusCode::FORBIDDEN)
                .body(Body::from(msg.to_string()))
                .unwrap());
        }
    } else {
        let port = parsed.port_or_known_default().unwrap_or(80);
        let addrs = tokio::net::lookup_host((host, port)).await.map_err(|_| {
            Response::builder()
                .status(StatusCode::BAD_GATEWAY)
                .body(Body::from("DNS resolution failed"))
                .unwrap()
        })?;
        for addr in addrs {
            if is_private_ip(addr.ip()) {
                return Err(Response::builder()
                    .status(StatusCode::FORBIDDEN)
                    .body(Body::from(msg.to_string()))
                    .unwrap());
            }
        }
    }
    Ok(())
}

pub async fn external_proxy_handler(
    Query(params): Query<ExternalProxyParams>,
    req: Request,
) -> Response {
    let target_url = params.url;

    if target_url.is_empty() {
        return Response::builder()
            .status(StatusCode::BAD_REQUEST)
            .body(Body::from("Missing url parameter"))
            .unwrap();
    }

    let parsed = match reqwest::Url::parse(&target_url) {
        Ok(u) => u,
        Err(_) => {
            return Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body(Body::from("Invalid URL"))
                .unwrap();
        }
    };

    let scheme = parsed.scheme();
    if scheme != "http" && scheme != "https" {
        return Response::builder()
            .status(StatusCode::BAD_REQUEST)
            .body(Body::from("Only http/https URLs are supported"))
            .unwrap();
    }

    if let Err(r) = check_host_not_private(&parsed, "Access to private/internal addresses is not allowed").await {
        return r;
    }

    let (method, headers, body_bytes) = match extract_request(req).await {
        Ok(v) => v,
        Err(r) => return r,
    };

    let mut proxy_req = HTTP_CLIENT_FOLLOW_REDIRECTS.request(
        reqwest::Method::from_bytes(method.as_str().as_bytes()).unwrap(),
        target_url.clone(),
    );

    for (name, value) in headers.iter() {
        let n = name.as_str();
        if n == "host" || n == "connection" || n == "upgrade" || n == "origin" || n == "referer"
            || n == "accept-encoding"
        {
            continue;
        }
        if let Ok(v) = value.to_str() {
            proxy_req = proxy_req.header(n, v);
        }
    }

    if !body_bytes.is_empty() {
        let content_type_val = headers
            .get(header::CONTENT_TYPE)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");
        if content_type_val.contains("application/x-www-form-urlencoded") {
            let mode = RewriteMode::External(target_url.clone());
            if let Some(rewritten) = rewrite_form_urlencoded_body(&body_bytes, &target_url, &mode) {
                proxy_req = proxy_req.body(rewritten);
            } else {
                proxy_req = proxy_req.body(body_bytes);
            }
        } else {
            proxy_req = proxy_req.body(body_bytes);
        }
    }

    let upstream_resp = match proxy_req.send().await {
        Ok(r) => r,
        Err(e) => {
            let msg = format!("Proxy error: {}", e);
            return Response::builder()
                .status(StatusCode::BAD_GATEWAY)
                .header(header::CONTENT_TYPE, "text/plain; charset=utf-8")
                .body(Body::from(msg))
                .unwrap();
        }
    };

    let final_url = upstream_resp.url().clone();
    let final_url_str = final_url.to_string();
    if let Err(r) = check_host_not_private(&final_url, "Redirect to private/internal address is not allowed").await {
        return r;
    }

    let inject_base = "";
    let escaped_url = final_url_str
        .replace('&', "&amp;")
        .replace('"', "&quot;")
        .replace('<', "&lt;")
        .replace('>', "&gt;");
    let inject_script = INJECT_SCRIPT_EXTERNAL.replacen(
        "<script>",
        &format!("<script data-base-url=\"{}\">", escaped_url),
        1,
    );
    build_proxied_response(upstream_resp, inject_base, &inject_script, Some(RewriteMode::External(final_url_str))).await
}

#[derive(Clone)]
enum RewriteMode {
    /// External proxy: rewrite to /api/proxy?url=<abs>
    External(String),
    /// Internal proxy: rewrite to /preview/{port}/path
    Internal(u16),
}

fn rewrite_url(raw: &str, base_url: &str, mode: &RewriteMode) -> Option<String> {
    let u = raw.trim();
    if u.is_empty()
        || u.starts_with('#')
        || u.starts_with("data:")
        || u.starts_with("blob:")
        || u.starts_with("javascript:")
        || u.starts_with("mailto:")
        || u.contains("/api/proxy")
        || u.contains("/preview/")
    {
        return None;
    }
    let abs = if u.starts_with("http://") || u.starts_with("https://") || u.starts_with("HTTP://") || u.starts_with("HTTPS://") {
        u.to_string()
    } else if u.starts_with("//") {
        format!("https:{}", u)
    } else if let Ok(base) = reqwest::Url::parse(base_url) {
        base.join(u).ok()?.to_string()
    } else {
        return None;
    };
    match mode {
        RewriteMode::External(_) => {
            Some(format!("/api/proxy?url={}", urlencoding::encode(&abs)))
        }
        RewriteMode::Internal(port) => {
            if let Ok(parsed) = reqwest::Url::parse(&abs) {
                let h = parsed.host_str().unwrap_or("");
                if h == "127.0.0.1" || h == "localhost" || h == "0.0.0.0" {
                    let p = parsed.port().unwrap_or(*port);
                    Some(format!(
                        "/preview/{}{}{}",
                        p,
                        parsed.path(),
                        parsed.query().map(|q| format!("?{}", q)).unwrap_or_default()
                    ))
                } else {
                    None
                }
            } else {
                None
            }
        }
    }
}

fn rewrite_css_urls(css: &str, base_url: &str, mode: &RewriteMode) -> String {
    CSS_URL_RE
        .replace_all(css, |caps: &regex::Captures| {
            let quote = &caps[1];
            let url = &caps[2];
            match rewrite_url(url, base_url, mode) {
                Some(rewritten) => format!("url({}{}{})", quote, rewritten, quote),
                None => caps[0].to_string(),
            }
        })
        .into_owned()
}

fn rewrite_html_urls(html: &str, base_url: &str, mode: &RewriteMode) -> String {
    let base_url = base_url.to_string();
    let mode_clone = mode.clone();
    let mut output = Vec::with_capacity(html.len());

    let attr_handler = |el: &mut lol_html::html_content::Element| {
        for attr_name in &["href", "src", "action", "poster", "data"] {
            if let Some(val) = el.get_attribute(attr_name) {
                if let Some(rewritten) = rewrite_url(&val, &base_url, &mode_clone) {
                    el.set_attribute(attr_name, &rewritten).ok();
                }
            }
        }
        if let Some(srcset) = el.get_attribute("srcset") {
            let rewritten_entries: Vec<String> = srcset
                .split(',')
                .map(|entry| {
                    let parts: Vec<&str> = entry.trim().splitn(2, char::is_whitespace).collect();
                    if parts.is_empty() {
                        return entry.to_string();
                    }
                    let url = parts[0];
                    let descriptor = if parts.len() > 1 { parts[1] } else { "" };
                    match rewrite_url(url, &base_url, &mode_clone) {
                        Some(rewritten) if descriptor.is_empty() => rewritten,
                        Some(rewritten) => format!("{} {}", rewritten, descriptor),
                        None => entry.trim().to_string(),
                    }
                })
                .collect();
            el.set_attribute("srcset", &rewritten_entries.join(", ")).ok();
        }
        Ok(())
    };

    let base_url2 = base_url.clone();
    let mode_clone2 = mode.clone();
    let style_handler = move |el: &mut lol_html::html_content::Element| {
        if let Some(style_val) = el.get_attribute("style") {
            let rewritten = rewrite_css_urls(&style_val, &base_url2, &mode_clone2);
            if rewritten != style_val {
                el.set_attribute("style", &rewritten).ok();
            }
        }
        Ok(())
    };

    let base_url3 = base_url.clone();
    let mode_clone3 = mode.clone();
    let meta_handler = move |el: &mut lol_html::html_content::Element| {
        let http_equiv = el.get_attribute("http-equiv").unwrap_or_default();
        if http_equiv.eq_ignore_ascii_case("refresh") {
            if let Some(content) = el.get_attribute("content") {
                static META_URL_RE: LazyLock<regex::Regex> = LazyLock::new(|| {
                    regex::Regex::new(r"(?i)(.*?url\s*=\s*)(.+)").unwrap()
                });
                if let Some(caps) = META_URL_RE.captures(&content) {
                    let prefix = &caps[1];
                    let url = &caps[2];
                    if let Some(rewritten) = rewrite_url(url.trim(), &base_url3, &mode_clone3) {
                        el.set_attribute("content", &format!("{}{}", prefix, rewritten)).ok();
                    }
                }
            }
        }
        Ok(())
    };

    {
        let base_url_s = base_url.clone();
        let mode_s = mode.clone();
        let mut rewriter = HtmlRewriter::new(
            Settings {
                element_content_handlers: vec![
                    element!("a, link, area, form, img, script, source, video, audio, embed, object, iframe, input, track", attr_handler),
                    element!("*[style]", style_handler),
                    element!("meta[http-equiv]", meta_handler),
                    element!("base", |el| {
                        el.remove();
                        Ok(())
                    }),
                ],
                ..Settings::new()
            },
            |c: &[u8]| output.extend_from_slice(c),
        );
        rewriter.write(html.as_bytes()).unwrap_or(());
        rewriter.end().unwrap_or(());

        let result = String::from_utf8(output).unwrap_or_else(|_| html.to_string());
        rewrite_style_blocks(&result, &base_url_s, &mode_s)
    }
}

fn rewrite_style_blocks(html: &str, base_url: &str, mode: &RewriteMode) -> String {
    static STYLE_BLOCK_RE: LazyLock<regex::Regex> = LazyLock::new(|| {
        regex::Regex::new(r"(?is)<style[^>]*>(.*?)</style>").unwrap()
    });
    STYLE_BLOCK_RE
        .replace_all(html, |caps: &regex::Captures| {
            let full = &caps[0];
            let inner = &caps[1];
            let rewritten = rewrite_css_urls(inner, base_url, mode);
            full.replace(inner, &rewritten)
        })
        .into_owned()
}

async fn extract_request(
    req: Request,
) -> Result<(axum::http::Method, axum::http::HeaderMap, Bytes), Response> {
    let method = req.method().clone();
    let headers = req.headers().clone();
    let body_bytes = axum::body::to_bytes(req.into_body(), 10 * 1024 * 1024)
        .await
        .map_err(|_| {
            Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body(Body::from("Request body too large"))
                .unwrap()
        })?;
    Ok((method, headers, body_bytes))
}

fn rewrite_form_urlencoded_body(body: &[u8], base_url: &str, mode: &RewriteMode) -> Option<Bytes> {
    let text = std::str::from_utf8(body).ok()?;
    let mut changed = false;
    let pairs: Vec<String> = text
        .split('&')
        .map(|pair| {
            if let Some((key, val)) = pair.split_once('=') {
                let decoded = urlencoding::decode(val).unwrap_or(std::borrow::Cow::Borrowed(val));
                if decoded.starts_with("http://") || decoded.starts_with("https://") {
                    if let Some(rewritten) = rewrite_url(&decoded, base_url, mode) {
                        changed = true;
                        return format!("{}={}", key, urlencoding::encode(&rewritten));
                    }
                }
            }
            pair.to_string()
        })
        .collect();
    if changed {
        Some(Bytes::from(pairs.join("&")))
    } else {
        None
    }
}

fn rewrite_set_cookie(cookie: &str, mode: &Option<RewriteMode>) -> String {
    static DOMAIN_RE: LazyLock<regex::Regex> =
        LazyLock::new(|| regex::Regex::new(r"(?i);\s*domain=[^;]*").unwrap());
    static PATH_RE: LazyLock<regex::Regex> =
        LazyLock::new(|| regex::Regex::new(r"(?i);\s*path=([^;]*)").unwrap());
    static SECURE_RE: LazyLock<regex::Regex> =
        LazyLock::new(|| regex::Regex::new(r"(?i);\s*secure").unwrap());
    static SAMESITE_RE: LazyLock<regex::Regex> =
        LazyLock::new(|| regex::Regex::new(r"(?i);\s*samesite=[^;]*").unwrap());

    let mut result = DOMAIN_RE.replace_all(cookie, "").into_owned();
    result = SECURE_RE.replace_all(&result, "").into_owned();
    result = SAMESITE_RE.replace_all(&result, "").into_owned();

    let path_prefix = match mode {
        Some(RewriteMode::Internal(port)) => format!("/preview/{}", port),
        Some(RewriteMode::External(_)) => "/api/proxy".to_string(),
        None => return result,
    };

    if let Some(caps) = PATH_RE.captures(&result) {
        let orig_path = caps.get(1).map(|m| m.as_str()).unwrap_or("/");
        let new_path = format!("{}{}", path_prefix, orig_path);
        result = PATH_RE
            .replace(&result, format!("; Path={}", new_path))
            .into_owned();
    } else {
        result = format!("{}; Path={}/", result, path_prefix);
    }

    result
}

async fn build_proxied_response(
    upstream_resp: reqwest::Response,
    inject_base: &str,
    inject_script: &str,
    rewrite_mode: Option<RewriteMode>,
) -> Response {
    let status = upstream_resp.status();
    let resp_headers = upstream_resp.headers().clone();
    let content_type = resp_headers
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();
    let is_html = content_type.contains("text/html");
    let is_css = content_type.contains("text/css");

    let mut builder = Response::builder().status(status.as_u16());
    for (name, value) in resp_headers.iter() {
        let n = name.as_str();
        if n == "transfer-encoding"
            || n == "connection"
            || n == "x-frame-options"
            || n == "content-security-policy"
            || n == "content-security-policy-report-only"
            || n == "content-encoding"
        {
            continue;
        }
        if (is_html || is_css) && n == "content-length" {
            continue;
        }
        if n == "location" {
            if let (Ok(loc), Some(mode)) = (value.to_str(), &rewrite_mode) {
                let base = match mode {
                    RewriteMode::Internal(port) => format!("http://127.0.0.1:{}", port),
                    RewriteMode::External(url) => url.clone(),
                };
                if let Some(rewritten) = rewrite_url(loc, &base, mode) {
                    builder = builder.header(n, rewritten);
                    continue;
                }
            }
        }
        if n == "set-cookie" {
            if let Ok(cookie_str) = value.to_str() {
                let rewritten = rewrite_set_cookie(cookie_str, &rewrite_mode);
                builder = builder.header(n, rewritten);
                continue;
            }
        }
        builder = builder.header(n, value);
    }

    if is_html {
        let inject = format!("{}{}", inject_base, inject_script);
        let full_body = upstream_resp.bytes().await.unwrap_or_default();
        let html_raw = String::from_utf8_lossy(&full_body);
        let html = BASE_TAG_RE.replace_all(&html_raw, "");
        let html = if let Some(mode) = &rewrite_mode {
            let base = match mode {
                RewriteMode::Internal(port) => format!("http://127.0.0.1:{}", port),
                RewriteMode::External(ref url) => url.clone(),
            };
            std::borrow::Cow::Owned(rewrite_html_urls(&html, &base, mode))
        } else {
            html
        };
        let mut buf = String::with_capacity(html.len() + inject.len());
        if let Some(pos) = html.find("<head>") {
            buf.push_str(&html[..pos + 6]);
            buf.push_str(&inject);
            buf.push_str(&html[pos + 6..]);
        } else if let Some(pos) = html.find("</head>") {
            buf.push_str(&html[..pos]);
            buf.push_str(&inject);
            buf.push_str(&html[pos..]);
        } else {
            buf.push_str(&inject);
            buf.push_str(&html);
        }
        builder
            .header(header::CONTENT_LENGTH, buf.len())
            .body(Body::from(buf))
            .unwrap()
    } else if is_css {
        if let Some(mode) = &rewrite_mode {
            let base = match mode {
                RewriteMode::Internal(port) => format!("http://127.0.0.1:{}", port),
                RewriteMode::External(ref url) => url.clone(),
            };
            let full_body = upstream_resp.bytes().await.unwrap_or_default();
            let css_raw = String::from_utf8_lossy(&full_body);
            let rewritten = rewrite_css_urls(&css_raw, &base, mode);
            builder
                .header(header::CONTENT_LENGTH, rewritten.len())
                .body(Body::from(rewritten))
                .unwrap()
        } else {
            let stream = upstream_resp.bytes_stream().map(|result| {
                result.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
            });
            builder.body(Body::from_stream(stream)).unwrap()
        }
    } else {
        let stream = upstream_resp.bytes_stream().map(|result| {
            result.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
        });
        builder.body(Body::from_stream(stream)).unwrap()
    }
}
