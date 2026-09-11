const thread = JSON.parse(document.getElementById('thread-data').textContent);

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const dayFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });
const monthFormat = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });

const parseDate = (value) => new Date(value.replace(' ', 'T') + 'Z');

const escapeHtml = (text) => text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const linkify = (text) => escapeHtml(text)
    .replace(/https?:\/\/[^\s<]+/g, (url) => `<a href="${url}" target="_blank" rel="noopener">${url.replace(/^https?:\/\//, '')}</a>`)
    .replace(/(^|[^\w/])@(\w{1,15})/g, (match, before, handle) => `${before}<a href="https://x.com/${handle}" target="_blank" rel="noopener">@${handle}</a>`)
    .replace(/(^|[^\w&/])#(\w+)/g, (match, before, tag) => `${before}<a href="https://x.com/hashtag/${tag}" target="_blank" rel="noopener">#${tag}</a>`);

const formatDuration = (seconds) => {
    const total = Math.round(seconds || 0);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

// Durée calendaire entre deux dates, en années, mois et jours
const formatSpan = (from, to) => {
    let years = to.getFullYear() - from.getFullYear();
    let months = to.getMonth() - from.getMonth();
    let days = to.getDate() - from.getDate();
    if (days < 0) {
        months -= 1;
        days += new Date(to.getFullYear(), to.getMonth(), 0).getDate();
    }
    if (months < 0) {
        years -= 1;
        months += 12;
    }
    const parts = [
        [years, 'year'],
        [months, 'month'],
        [days, 'day'],
    ]
        .filter(([value]) => value > 0)
        .map(([value, unit]) => `${value} ${unit}${value > 1 ? 's' : ''}`);
    return parts.length ? parts.join(', ') : 'same day';
};

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

// Liste plate de tous les médias, dans l'ordre du thread
const gallery = [];
thread.posts.forEach((post, postIndex) => {
    post.media.forEach((item, mediaIndex) => {
        gallery.push({ ...item, postIndex, mediaIndex, post });
    });
});

const photoCount = gallery.filter((item) => item.type === 'photo').length;
const videoCount = gallery.length - photoCount;

// Barre de navigation : retour à l'index et menu des autres projets

const renderNav = () => {
    const others = (typeof projects === 'undefined' ? [] : projects)
        .filter((project) => project.folder !== thread.folder);
    const menu = others.length
        ? `<details class="projects-menu">
               <summary class="projects-menu-toggle">Other projects</summary>
               <ul class="projects-menu-list">
                   ${others.map((project) => `<li><a href="../${project.folder}/index.html">${escapeHtml(project.title)}<span class="projects-menu-count">${project.posts} posts</span></a></li>`).join('')}
               </ul>
           </details>`
        : '';
    document.getElementById('top-nav').innerHTML = `
        <a class="top-nav-home" href="../index.html">Builds</a>
        ${menu}
    `;
};

document.addEventListener('click', (event) => {
    const open = document.querySelector('.projects-menu[open]');
    if (open && !open.contains(event.target)) {
        open.removeAttribute('open');
    }
});

// En-tête

// Période de build : dates fixées à la main, sinon premier et dernier post
const built = thread.built || {};
const buildStart = built.from ? new Date(built.from + 'T12:00:00') : parseDate(thread.posts[0].date);
const buildEnd = built.to
    ? new Date(built.to + 'T12:00:00')
    : (thread.status === 'done' ? parseDate(thread.posts[thread.posts.length - 1].date) : null);

// Index du premier post posterieur a la fin du build, ou -1
const isAfterBuild = (date) => buildEnd && date > buildEnd && date.toDateString() !== buildEnd.toDateString();
const firstUpgradeIndex = thread.posts.findIndex((post) => isAfterBuild(parseDate(post.date)));

const renderHeader = () => {
    const first = buildStart;
    const last = buildEnd;
    const months = [];
    thread.posts.forEach((post) => {
        const date = parseDate(post.date);
        const key = monthKey(date);
        const entry = months.find((month) => month.key === key);
        if (entry) {
            entry.count += 1;
        } else {
            months.push({ key, label: monthFormat.format(date), count: 1 });
        }
    });

    document.getElementById('thread-header').innerHTML = `
        <div class="thread-intro">
            <h1 class="thread-title">${escapeHtml(thread.title)}</h1>
            <div class="thread-author">
                <img class="thread-avatar" src="${thread.author.avatar}" alt="" width="44" height="44">
                <div class="thread-author-identity">
                    <a class="thread-author-name" href="${thread.author.url}" target="_blank" rel="noopener">${escapeHtml(thread.author.name)}</a>
                    <span class="thread-author-handle">@${escapeHtml(thread.author.handle)}</span>
                </div>
                <a class="thread-source" href="${thread.url}" target="_blank" rel="noopener">View thread on X</a>
            </div>
            ${thread.note ? `<p class="thread-note">${escapeHtml(thread.note)}</p>` : ''}
        </div>
        <dl class="thread-figures">
            <div class="thread-figure"><dt>Posts</dt><dd>${thread.posts.length}</dd></div>
            <div class="thread-figure"><dt>Photos</dt><dd>${photoCount}</dd></div>
            <div class="thread-figure"><dt>Videos</dt><dd>${videoCount}</dd></div>
            <div class="thread-period">
                <dt>Build</dt>
                <dd>
                    <span class="thread-period-dates">${dateFormat.format(first)} <span class="thread-period-arrow" aria-label="to">&rarr;</span> ${last ? dateFormat.format(last) : 'now'}</span>
                    <span class="thread-period-span">${last ? formatSpan(first, last) : 'work in progress'}</span>
                </dd>
            </div>
        </dl>
        <ul class="thread-jumps">
            <li><a href="#post-1">First post</a></li>
            ${buildEnd && firstUpgradeIndex !== 0 ? `<li><a href="#post-${firstUpgradeIndex === -1 ? thread.posts.length : firstUpgradeIndex}">Build end</a></li>` : ''}
            ${firstUpgradeIndex !== -1 ? '<li><a href="#upgrades">Upgrades and tweaks</a></li>' : ''}
            <li><a href="#post-${thread.posts.length}">Latest post</a></li>
        </ul>
        <ul class="thread-months">
            ${months.map((month) => `<li><a href="#month-${month.key}">${month.label}<span class="thread-month-count">${month.count}</span></a></li>`).join('')}
        </ul>
    `;
};

// Chronologie

const playIcon = `<svg class="play-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <circle cx="32" cy="32" r="30"></circle>
    <path d="M26 20l18 12-18 12z"></path>
</svg>`;

const renderMediaCell = (item, galleryIndex) => {
    const label = item.type === 'photo' ? 'Enlarge photo' : 'Play video';
    const size = item.width && item.height ? `width="${item.width}" height="${item.height}"` : '';
    const preview = item.poster
        ? `<img src="${item.poster}" alt="" loading="lazy" ${size}>`
        : `<video src="${item.file}" muted playsinline preload="metadata" ${size}></video>`;
    const inner = item.type === 'photo'
        ? `<img src="${item.file}" alt="" loading="lazy" ${size}>`
        : `${preview}${playIcon}<span class="media-badge">${item.type === 'animated_gif' ? 'GIF' : 'Video'} ${formatDuration(item.duration)}</span>`;
    return `<button class="media-cell" type="button" data-gallery="${galleryIndex}" aria-label="${label}">${inner}</button>`;
};

const renderTimeline = () => {
    const parts = [];
    let currentMonth = null;
    let galleryIndex = 0;

    let afterBuild = false;

    thread.posts.forEach((post, index) => {
        const date = parseDate(post.date);
        const key = monthKey(date);
        if (!afterBuild && isAfterBuild(date)) {
            afterBuild = true;
            currentMonth = null;
            parts.push('<h2 class="timeline-divider" id="upgrades">Upgrades and tweaks</h2>');
        }
        if (key !== currentMonth) {
            currentMonth = key;
            parts.push(`<h2 class="timeline-month" id="month-${key}">${monthFormat.format(date)}</h2>`);
        }

        const cells = post.media.map((item) => renderMediaCell(item, galleryIndex++)).join('');
        const portraitCount = post.media.filter((item) => item.width && item.height && item.height > item.width).length;
        let orientation = 'mixed';
        if (portraitCount === 0) {
            orientation = 'landscape';
        } else if (portraitCount === post.media.length) {
            orientation = 'portrait';
        }
        const media = post.media.length
            ? `<div class="post-media" data-count="${Math.min(post.media.length, 4)}" data-orientation="${orientation}">${cells}</div>`
            : '';

        parts.push(`
            <article class="post" id="post-${index + 1}">
                <div class="post-rail">
                    <time datetime="${date.toISOString()}">
                        <span class="post-day">${dayFormat.format(date)}</span>
                        <span class="post-time">${timeFormat.format(date)}</span>
                    </time>
                </div>
                <div class="post-body">
                    <p class="post-text">${linkify(post.text)}</p>
                    ${media}
                    <div class="post-meta">
                        <span class="post-index">${index + 1} / ${thread.posts.length}</span>
                        <a class="post-link" href="${post.url}" target="_blank" rel="noopener">Original post</a>
                    </div>
                </div>
            </article>
        `);
    });

    document.getElementById('timeline').innerHTML = parts.join('');
    document.getElementById('thread-footer').textContent =
        `Archived on ${dateFormat.format(new Date(thread.fetched_at))} from ${thread.url}`;
};

// Visionneuse

const lightbox = document.getElementById('lightbox');
lightbox.innerHTML = `
    <div class="lightbox-bar">
        <span class="lightbox-counter"></span>
        <span class="lightbox-zoom"></span>
        <div class="lightbox-tools">
            <button class="lightbox-button" type="button" data-action="zoom-out" aria-label="Zoom out">&minus;</button>
            <button class="lightbox-button" type="button" data-action="zoom-reset" aria-label="Reset zoom">1:1</button>
            <button class="lightbox-button" type="button" data-action="zoom-in" aria-label="Zoom in">+</button>
            <button class="lightbox-button" type="button" data-action="close" aria-label="Close">&times;</button>
        </div>
    </div>
    <div class="lightbox-stage">
        <div class="lightbox-media"></div>
        <button class="lightbox-nav lightbox-prev" type="button" data-action="prev" aria-label="Previous">&lsaquo;</button>
        <button class="lightbox-nav lightbox-next" type="button" data-action="next" aria-label="Next">&rsaquo;</button>
    </div>
    <div class="lightbox-caption">
        <span class="lightbox-caption-text"></span>
        <a class="lightbox-caption-link" href="#" target="_blank" rel="noopener">Original post</a>
        <span class="lightbox-hint">Scroll or double-click to zoom, drag to pan, arrow keys to navigate, Esc to close</span>
    </div>
`;

const stage = lightbox.querySelector('.lightbox-stage');
const mediaHost = lightbox.querySelector('.lightbox-media');
const counter = lightbox.querySelector('.lightbox-counter');
const zoomLabel = lightbox.querySelector('.lightbox-zoom');
const captionText = lightbox.querySelector('.lightbox-caption-text');
const captionLink = lightbox.querySelector('.lightbox-caption-link');
const prevButton = lightbox.querySelector('[data-action="prev"]');
const nextButton = lightbox.querySelector('[data-action="next"]');

const MIN_SCALE = 1;
const MAX_SCALE = 6;

let current = -1;
let lastFocus = null;
let image = null;
let zoom = { scale: 1, x: 0, y: 0 };
const pointers = new Map();
let pinchStart = null;
let drag = null;

const applyZoom = () => {
    if (!image) {
        return;
    }
    image.style.transform = `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`;
    zoomLabel.textContent = zoom.scale > 1 ? `${Math.round(zoom.scale * 100)} %` : '';
};

const clampPan = () => {
    const bounds = stage.getBoundingClientRect();
    const rect = image.getBoundingClientRect();
    const baseWidth = rect.width / zoom.scale;
    const baseHeight = rect.height / zoom.scale;
    const maxX = Math.max(0, (baseWidth * zoom.scale - bounds.width) / 2 + 40);
    const maxY = Math.max(0, (baseHeight * zoom.scale - bounds.height) / 2 + 40);
    zoom.x = Math.min(maxX, Math.max(-maxX, zoom.x));
    zoom.y = Math.min(maxY, Math.max(-maxY, zoom.y));
};

const resetZoom = () => {
    zoom = { scale: 1, x: 0, y: 0 };
    applyZoom();
};

// Zoome vers un point de l'écran pour que ce point reste sous le curseur
const zoomTo = (nextScale, clientX, clientY) => {
    if (!image) {
        return;
    }
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
    const bounds = stage.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const pointX = (clientX ?? centerX) - centerX;
    const pointY = (clientY ?? centerY) - centerY;
    const ratio = scale / zoom.scale;
    zoom.x = pointX - (pointX - zoom.x) * ratio;
    zoom.y = pointY - (pointY - zoom.y) * ratio;
    zoom.scale = scale;
    if (scale === 1) {
        zoom.x = 0;
        zoom.y = 0;
    } else {
        clampPan();
    }
    applyZoom();
};

const showMedia = (index) => {
    const item = gallery[index];
    if (!item) {
        return;
    }
    current = index;
    mediaHost.querySelector('video')?.pause();
    mediaHost.innerHTML = '';
    image = null;
    resetZoom();

    if (item.type === 'photo') {
        image = document.createElement('img');
        image.src = item.file;
        image.alt = '';
        image.draggable = false;
        mediaHost.appendChild(image);
        stage.classList.remove('is-video');
    } else {
        const video = document.createElement('video');
        video.src = item.file;
        video.controls = true;
        video.preload = 'auto';
        video.loop = item.type === 'animated_gif';
        video.playsInline = true;
        mediaHost.appendChild(video);
        stage.classList.add('is-video');

        // Si le navigateur refuse la lecture automatique, on affiche un bouton lecture
        const overlay = document.createElement('button');
        overlay.type = 'button';
        overlay.className = 'lightbox-play';
        overlay.setAttribute('aria-label', 'Play video');
        overlay.innerHTML = playIcon;
        overlay.hidden = true;
        overlay.addEventListener('click', () => video.play());
        video.addEventListener('play', () => { overlay.hidden = true; });
        video.addEventListener('ended', () => { overlay.hidden = false; });
        mediaHost.appendChild(overlay);
        video.play().catch(() => { overlay.hidden = false; });
    }

    const date = parseDate(item.post.date);
    counter.textContent = `${index + 1} / ${gallery.length}`;
    captionText.textContent = `Post ${item.postIndex + 1}, ${dateFormat.format(date)} at ${timeFormat.format(date)}`;
    captionLink.href = item.post.url;
    prevButton.disabled = index === 0;
    nextButton.disabled = index === gallery.length - 1;
    applyZoom();
};

const openLightbox = (index) => {
    lastFocus = document.activeElement;
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    showMedia(index);
    lightbox.querySelector('[data-action="close"]').focus();
};

const closeLightbox = () => {
    mediaHost.querySelector('video')?.pause();
    lightbox.hidden = true;
    document.body.style.overflow = '';
    lastFocus?.focus();
};

const step = (delta) => {
    const next = current + delta;
    if (next >= 0 && next < gallery.length) {
        showMedia(next);
    }
};

// Interactions

document.addEventListener('click', (event) => {
    const cell = event.target.closest('.media-cell');
    if (cell) {
        openLightbox(Number(cell.dataset.gallery));
    }
});

lightbox.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'close') {
        closeLightbox();
    } else if (action === 'prev') {
        step(-1);
    } else if (action === 'next') {
        step(1);
    } else if (action === 'zoom-in') {
        zoomTo(zoom.scale * 1.5);
    } else if (action === 'zoom-out') {
        zoomTo(zoom.scale / 1.5);
    } else if (action === 'zoom-reset') {
        resetZoom();
    } else if (event.target === mediaHost || event.target === stage) {
        closeLightbox();
    }
});

document.addEventListener('keydown', (event) => {
    if (lightbox.hidden) {
        return;
    }
    const keys = {
        Escape: closeLightbox,
        ArrowLeft: () => step(-1),
        ArrowRight: () => step(1),
        '+': () => zoomTo(zoom.scale * 1.5),
        '=': () => zoomTo(zoom.scale * 1.5),
        '-': () => zoomTo(zoom.scale / 1.5),
        '0': resetZoom,
    };
    if (keys[event.key]) {
        event.preventDefault();
        keys[event.key]();
    }
});

stage.addEventListener('wheel', (event) => {
    if (!image) {
        return;
    }
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.2 : 1 / 1.2;
    zoomTo(zoom.scale * factor, event.clientX, event.clientY);
}, { passive: false });

stage.addEventListener('dblclick', (event) => {
    if (!image || event.target.closest('button')) {
        return;
    }
    if (zoom.scale > 1) {
        resetZoom();
    } else {
        zoomTo(2.5, event.clientX, event.clientY);
    }
});

stage.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button') || event.target.tagName === 'VIDEO') {
        return;
    }
    stage.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchStart = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: zoom.scale };
        drag = null;
    } else if (pointers.size === 1) {
        drag = { startX: event.clientX, startY: event.clientY, originX: zoom.x, originY: zoom.y, moved: false };
    }
    image?.classList.add('is-zooming');
});

stage.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) {
        return;
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 2 && pinchStart && image) {
        const [a, b] = [...pointers.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        zoomTo(pinchStart.scale * (distance / pinchStart.distance), (a.x + b.x) / 2, (a.y + b.y) / 2);
        return;
    }

    if (drag && pointers.size === 1) {
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
            drag.moved = true;
            stage.classList.add('is-dragging');
        }
        if (image && zoom.scale > 1) {
            zoom.x = drag.originX + dx;
            zoom.y = drag.originY + dy;
            clampPan();
            applyZoom();
        }
    }
});

const endPointer = (event) => {
    if (!pointers.has(event.pointerId)) {
        return;
    }
    pointers.delete(event.pointerId);
    stage.classList.remove('is-dragging');
    image?.classList.remove('is-zooming');

    if (pointers.size === 0 && drag) {
        const dx = event.clientX - drag.startX;
        // Balayage horizontal sans zoom : média précédent ou suivant
        if (zoom.scale === 1 && Math.abs(dx) > 60) {
            step(dx < 0 ? 1 : -1);
        }
        drag = null;
    }
    if (pointers.size < 2) {
        pinchStart = null;
    }
};

stage.addEventListener('pointerup', endPointer);
stage.addEventListener('pointercancel', endPointer);

renderNav();
renderHeader();
renderTimeline();
