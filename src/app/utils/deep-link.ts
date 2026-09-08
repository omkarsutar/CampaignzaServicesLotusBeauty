export function isInAppBrowser(): boolean {
    const ua = navigator.userAgent || '';
    // common markers for Facebook / Instagram / WhatsApp / in-app browsers
    return /FBAN|FBAV|Instagram|FB_IAB|FB4A|Messenger|WhatsApp|Line|FBAN|FBAV/i.test(ua);
}

export function openWithDeepLink(deepUrl: string | null | undefined, webUrl: string, timeout = 900): void {
    if (!webUrl) return;

    const ua = navigator.userAgent || '';
    let tryUrl = deepUrl || null;

    // On Android, prefer intent:// form for known schemes to increase chance of opening app
    if (tryUrl && /Android/i.test(ua)) {
        if (tryUrl.startsWith('instagram://')) {
            tryUrl = `intent://${tryUrl.slice('instagram://'.length)}#Intent;package=com.instagram.android;scheme=instagram;end`;
        } else if (tryUrl.startsWith('fb://') || tryUrl.startsWith('facebook://')) {
            tryUrl = `intent://${tryUrl.replace(/^(fb|facebook):\/\//, '')}#Intent;package=com.facebook.katana;scheme=fb;end`;
        } else if (tryUrl.startsWith('whatsapp://')) {
            tryUrl = `intent://${tryUrl.slice('whatsapp://'.length)}#Intent;package=com.whatsapp;scheme=whatsapp;end`;
        } else if (tryUrl.startsWith('vnd.youtube://') || tryUrl.startsWith('youtube://')) {
            tryUrl = `intent://${tryUrl.replace(/^(vnd.youtube:|youtube:)\/\//, '')}#Intent;package=com.google.android.youtube;scheme=vnd.youtube;end`;
        }
    }

    // If no deep link or not an in-app browser, just open the web URL
    if (!tryUrl || !isInAppBrowser()) {
        window.location.href = webUrl;
        return;
    }

    const now = Date.now();
    let fallbackTimer: number | undefined;

    try {
        // Try to open via iframe for webviews where setting location is blocked
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = tryUrl;
        document.body.appendChild(iframe);

        fallbackTimer = window.setTimeout(() => {
            document.body.removeChild(iframe);
            // If app didn't open within timeout, navigate to web URL
            if (Date.now() - now < timeout + 200) {
                window.location.href = webUrl;
            }
        }, timeout) as unknown as number;
    } catch (e) {
        // Fallback: set location then fallback to web URL after timeout
        try {
            window.location.href = tryUrl;
        } catch (_err) {
            // ignore
        }
        window.setTimeout(() => {
            window.location.href = webUrl;
        }, timeout);
    }

    // As a safety net, ensure fallback occurs
    window.setTimeout(() => {
        if (fallbackTimer) {
            clearTimeout(fallbackTimer as any);
        }
        // final check — if still on this page, navigate to web
        // (do not force navigation if user left the page)
        try {
            // noop to access location
            void window.location.href;
        } catch (_) {
            // ignore
        }
    }, timeout + 1200);
}
