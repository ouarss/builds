// Visionneuse des photos de pièces recherchées, accueil et pages projet.
// Reprend le balisage et les styles de la visionneuse des threads, sans le zoom.

const wantedLightbox = document.createElement('div');
wantedLightbox.className = 'lightbox';
wantedLightbox.hidden = true;
wantedLightbox.innerHTML = `
    <div class="lightbox-bar">
        <span class="lightbox-counter"></span>
        <div class="lightbox-tools">
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
        <a class="lightbox-caption-link" href="#" target="_blank" rel="noopener">Open image</a>
        <span class="lightbox-hint">Arrow keys to navigate, Esc to close</span>
    </div>
`;
document.body.appendChild(wantedLightbox);

const wantedStage = wantedLightbox.querySelector('.lightbox-stage');
const wantedMedia = wantedLightbox.querySelector('.lightbox-media');
const wantedCounter = wantedLightbox.querySelector('.lightbox-counter');
const wantedCaption = wantedLightbox.querySelector('.lightbox-caption-text');
const wantedLink = wantedLightbox.querySelector('.lightbox-caption-link');
const wantedPrev = wantedLightbox.querySelector('[data-action="prev"]');
const wantedNext = wantedLightbox.querySelector('[data-action="next"]');

let wantedItems = [];
let wantedIndex = -1;
let wantedLastFocus = null;

const showWanted = (index) => {
    const item = wantedItems[index];
    if (!item) {
        return;
    }
    wantedIndex = index;
    wantedMedia.innerHTML = '';
    const image = document.createElement('img');
    image.src = item.src;
    image.alt = '';
    image.draggable = false;
    wantedMedia.appendChild(image);
    wantedCounter.textContent = wantedItems.length > 1 ? `${index + 1} / ${wantedItems.length}` : '';
    wantedCaption.textContent = item.caption;
    wantedLink.href = item.src;
    wantedPrev.disabled = index === 0;
    wantedNext.disabled = index === wantedItems.length - 1;
};

const openWanted = (photo) => {
    const part = photo.closest('.wanted-part');
    const name = part.querySelector('.wanted-name')?.textContent ?? '';
    const cab = part.closest('.wanted-group')?.querySelector('.wanted-group-title')?.textContent;
    const caption = cab ? `${cab}, ${name}` : name;
    const photos = [...part.querySelectorAll('.wanted-photo')];
    wantedItems = photos.map((link) => ({ src: link.href, caption }));
    wantedLastFocus = document.activeElement;
    wantedLightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    showWanted(photos.indexOf(photo));
    wantedLightbox.querySelector('[data-action="close"]').focus();
};

const closeWanted = () => {
    wantedLightbox.hidden = true;
    document.body.style.overflow = '';
    wantedLastFocus?.focus();
};

const stepWanted = (delta) => {
    const next = wantedIndex + delta;
    if (next >= 0 && next < wantedItems.length) {
        showWanted(next);
    }
};

document.addEventListener('click', (event) => {
    const photo = event.target.closest('.wanted-photo');
    if (photo && photo.matches('a')) {
        event.preventDefault();
        openWanted(photo);
    }
});

wantedLightbox.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'close') {
        closeWanted();
    } else if (action === 'prev') {
        stepWanted(-1);
    } else if (action === 'next') {
        stepWanted(1);
    } else if (event.target === wantedMedia || event.target === wantedStage) {
        closeWanted();
    }
});

document.addEventListener('keydown', (event) => {
    if (wantedLightbox.hidden) {
        return;
    }
    if (event.key === 'Escape') {
        closeWanted();
    } else if (event.key === 'ArrowLeft') {
        stepWanted(-1);
    } else if (event.key === 'ArrowRight') {
        stepWanted(1);
    }
});
