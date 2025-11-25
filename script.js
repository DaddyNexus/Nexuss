const SITE_CONFIG = {
    githubUsername: 'DaddyNexus',
    name: 'Nexus',
    role: 'C# Developer',
    summary: 'I just make unturned plugins in my free time and sometimes make bots',
    heroEyebrow: '',
    focusAreas: [],
    about: 'I do C#. The Unturned Code i do is rocketmod. I can do advance uis etc',
    availability: '',
    currentFocus: 'Currently working on a Unturned roleplay server',
    location: 'Australia',
    serverUrl: 'https://discord.gg/crestunturned',
    contactSummary: '',
    stack: [
        { title: 'Languages', items: ['C#'] },
        { title: 'Unturned', items: ['RocketMod'] },
        { title: 'Other', items: ['Advanced UIs'] },
    ],
    highlightRepos: [],
    contact: {
        email: '',
        socials: [
            { label: 'LinkedIn', url: 'https://www.linkedin.com' },
            { label: 'X', url: 'https://x.com' },
            { label: 'GitHub', url: 'https://github.com/DaddyNexus' },
        ],
    },
};

const GH_API_BASE = 'https://api.github.com';
let cachedRepos = null;

document.addEventListener('DOMContentLoaded', () => {
    initSnow();
    initMusicPlayer();
    initStaticContent();
    if (!isUsernameConfigured()) {
        showConfigReminder();
        return;
    }
    hydrateFromGitHub();
});

function isUsernameConfigured() {
    const username = SITE_CONFIG.githubUsername;
    return username && !username.includes('your-github');
}

function initStaticContent() {
    const {
        name,
        role,
        heroEyebrow,
        tagline,
        summary,
        focusAreas,
        about,
        availability,
        currentFocus,
        location,
        contactSummary,
        stack,
        contact,
        resumeUrl,
    } = SITE_CONFIG;

    setText('hero-name', name);
    setText('nav-name', name);
    setText('footer-name', name);
    setText('nav-role', role);
    setText('hero-eyebrow', heroEyebrow);
    setText('hero-tagline', tagline);
    setText('hero-subtext', summary);
    setText('about-text', about);
    setText('about-subtext', summary);
    setText('fact-availability', availability);
    setText('fact-current', currentFocus);
    setText('fact-location', location);
    setText('fact-focus', focusAreas?.[0] || 'Product engineering');
    setText('contact-summary', contactSummary);

    renderFocusAreas(focusAreas);
    renderStack(stack);
    renderContact(contact, location, availability);
    setLink('resume-link', resumeUrl);
    setLink('server-link', SITE_CONFIG.serverUrl || '#');
    updateContactButton(contact?.email);

    const yearEl = document.getElementById('footer-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
}

function renderFocusAreas(areas = []) {
    const container = document.getElementById('focus-areas');
    if (!container) return;
    container.innerHTML = '';
    if (!areas.length) {
        container.classList.add('muted');
        container.textContent = 'Add focus areas inside SITE_CONFIG.focusAreas.';
        return;
    }
    areas.forEach(area => {
        const pill = document.createElement('span');
        pill.className = 'pill';
        pill.textContent = area;
        container.appendChild(pill);
    });
}

function renderStack(groups = []) {
    const grid = document.getElementById('stack-grid');
    if (!grid) return;
    grid.innerHTML = '';
    if (!groups.length) {
        grid.innerHTML = '<p class="muted">Add stack groups inside `SITE_CONFIG.stack`.</p>';
        return;
    }
    groups.forEach(group => {
        const card = document.createElement('article');
        card.className = 'stack-card';
        card.innerHTML = `
            <h3>${group.title}</h3>
            <ul>${(group.items || []).map(item => `<li>${item}</li>`).join('')}</ul>
        `;
        grid.appendChild(card);
    });
}

function renderContact(contact = {}, location, availability) {
    const contactList = document.getElementById('contact-list');
    const socialContainer = document.getElementById('contact-socials');
    if (contactList) {
        contactList.innerHTML = '';
        const rows = [
            { label: 'Location', value: location },
            { label: 'Availability', value: availability },
        ].filter(Boolean);

        rows.forEach(row => {
            const li = document.createElement('li');
            const label = document.createElement('span');
            label.className = 'muted small';
            label.textContent = row.label;
            const value = document.createElement(row.href ? 'a' : 'span');
            value.textContent = row.value;
            if (row.href) {
                value.href = row.href;
                value.target = '_blank';
                value.rel = 'noopener';
            }
            li.append(label, value);
            contactList.appendChild(li);
        });
    }

    if (socialContainer) {
        socialContainer.innerHTML = '';
        (contact.socials || []).forEach(social => {
            const anchor = document.createElement('a');
            anchor.href = social.url;
            anchor.target = '_blank';
            anchor.rel = 'noopener';
            anchor.textContent = social.label;
            socialContainer.appendChild(anchor);
        });
    }
}

function setLink(id, href = '#') {
    const el = document.getElementById(id);
    if (!el) return;
    el.href = href;
    if (href === '#') {
        el.setAttribute('aria-disabled', 'true');
    } else {
        el.removeAttribute('aria-disabled');
    }
}

function updateContactButton(email) {
    const button = document.getElementById('contact-btn');
    const contactCard = button?.closest('.contact-card');
    if (!button) return;
    if (email) {
        button.href = `mailto:${email}`;
        button.textContent = `Email ${SITE_CONFIG.name.split(' ')[0] || 'me'}`;
        if (contactCard) contactCard.style.display = '';
    } else {
        if (contactCard) contactCard.style.display = 'none';
    }
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null) {
        el.textContent = value;
    }
}

async function hydrateFromGitHub() {
    const username = SITE_CONFIG.githubUsername;
    setLink('github-link', `https://github.com/${username}`);

    try {
        const profile = await fetchProfile(username);
        updateProfileCard(profile);
    } catch (error) {
        console.error(error);
    }

    let repos = [];
    try {
        repos = await fetchRepos(username);
        updateStats(repos);
        renderProjects(repos);
    } catch (error) {
        console.error(error);
        showProjectsError();
    }

    try {
        const events = await fetchEvents(username);
        renderActivity(events);
    } catch (error) {
        console.error(error);
        showActivityError();
    }
}

async function fetchProfile(username) {
    const response = await fetch(`${GH_API_BASE}/users/${username}`, {
        headers: { Accept: 'application/vnd.github+json' },
    });
    if (!response.ok) throw new Error('Unable to load GitHub profile.');
    return response.json();
}

async function fetchRepos(username) {
    if (cachedRepos) return cachedRepos;
    const response = await fetch(`${GH_API_BASE}/users/${username}/repos?per_page=100&sort=updated`, {
        headers: { Accept: 'application/vnd.github+json' },
    });
    if (!response.ok) throw new Error('Unable to load repositories.');
    cachedRepos = await response.json();
    return cachedRepos;
}

async function fetchEvents(username) {
    const response = await fetch(`${GH_API_BASE}/users/${username}/events/public?per_page=8`, {
        headers: { Accept: 'application/vnd.github+json' },
    });
    if (!response.ok) throw new Error('Unable to load activity.');
    return response.json();
}

function updateProfileCard(profile) {
    setText('profile-name', profile.name || SITE_CONFIG.name);
    setText('profile-login', profile.login ? `@${profile.login}` : SITE_CONFIG.githubUsername);
    setText('profile-bio', profile.bio || SITE_CONFIG.tagline);
    setText('profile-location', profile.location || SITE_CONFIG.location);
    setText('profile-company', profile.company || 'Independent');
    const joinedYear = profile.created_at ? new Date(profile.created_at).getFullYear() : '—';
    setText('profile-joined', `On GitHub since ${joinedYear}`);
    const avatar = document.getElementById('profile-avatar');
    if (avatar && profile.avatar_url) {
        avatar.src = profile.avatar_url;
        avatar.alt = `${profile.login || 'GitHub'} avatar`;
    }
    setText('github-followers', formatNumber(profile.followers));
    setText('github-repos', formatNumber(profile.public_repos));
    setText('github-gists', formatNumber(profile.public_gists));
}

function updateStats(repos = []) {
    const totalStars = repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
    setText('github-stars', formatNumber(totalStars));
}

function renderProjects(repos = []) {
    const grid = document.getElementById('project-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const selected = selectFeaturedRepos(repos);
    if (!selected.length) {
        grid.innerHTML = '<p class="muted">No repositories found. Once you make some public work, it will appear here.</p>';
        return;
    }

    selected.forEach(repo => {
        const card = document.createElement('article');
        card.className = 'project-card';

        const header = document.createElement('div');
        header.className = 'project-header';

        const title = document.createElement('h3');
        const link = document.createElement('a');
        link.href = repo.html_url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = repo.name;
        title.appendChild(link);

        const language = document.createElement('p');
        language.className = 'repo-language';
        language.textContent = repo.language || '—';

        header.append(title, language);

        const description = document.createElement('p');
        description.textContent = repo.description || 'Add a description on GitHub to showcase what this project does.';

        const meta = document.createElement('div');
        meta.className = 'project-meta';
        [
            `★ ${formatNumber(repo.stargazers_count)}`,
            `⑂ ${formatNumber(repo.forks_count)}`,
            repo.license?.spdx_id || 'No license',
            formatRelativeDate(repo.updated_at),
        ].forEach(text => {
            const span = document.createElement('span');
            span.textContent = text;
            meta.appendChild(span);
        });

        const topicsWrap = document.createElement('div');
        (repo.topics || []).slice(0, 4).forEach(topic => {
            const pill = document.createElement('span');
            pill.className = 'topic-pill';
            pill.textContent = topic;
            topicsWrap.appendChild(pill);
        });

        card.append(header, description, meta, topicsWrap);
        grid.appendChild(card);
    });
}

function selectFeaturedRepos(repos) {
    const pins = SITE_CONFIG.highlightRepos || [];
    if (!pins.length) return repos.slice(0, 6);
    const repoMap = new Map(
        repos.map(repo => [repo.name.toLowerCase(), repo]),
    );
    return pins
        .map(pin => {
            const name = pin.includes('/') ? pin.split('/')[1] : pin;
            return repoMap.get(name.toLowerCase());
        })
        .filter(Boolean);
}

function renderActivity(events = []) {
    const container = document.getElementById('activity-list');
    if (!container) return;
    container.innerHTML = '';

    if (!events.length) {
        container.innerHTML = '<p class="muted">No public activity yet. Once you commit or star repos, it will show up here.</p>';
        return;
    }

    events.forEach(event => {
        const item = document.createElement('article');
        item.className = 'timeline-item';

        const title = document.createElement('h3');
        const link = document.createElement('a');
        link.href = buildEventUrl(event);
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = describeEvent(event);
        title.appendChild(link);

        const time = document.createElement('time');
        time.dateTime = event.created_at;
        time.textContent = formatRelativeDate(event.created_at);

        item.append(title, time);
        container.appendChild(item);
    });
}

function describeEvent(event) {
    const repoName = event.repo?.name || 'a repository';
    switch (event.type) {
        case 'PushEvent':
            return `Pushed ${event.payload?.size || 1} commit(s) to ${repoName}`;
        case 'PullRequestEvent':
            return `${capitalize(event.payload?.action || 'updated')} PR #${event.payload?.number} in ${repoName}`;
        case 'IssuesEvent':
            return `${capitalize(event.payload?.action || 'updated')} issue #${event.payload?.issue?.number} in ${repoName}`;
        case 'ReleaseEvent':
            return `Published ${event.payload?.release?.tag_name || 'a release'} in ${repoName}`;
        case 'CreateEvent':
            return `Created ${event.payload?.ref_type || 'content'} in ${repoName}`;
        case 'WatchEvent':
            return `Starred ${repoName}`;
        default:
            return `${event.type.replace('Event', '')} activity in ${repoName}`;
    }
}

function buildEventUrl(event) {
    const repoUrl = `https://github.com/${event.repo?.name || ''}`;
    switch (event.type) {
        case 'PullRequestEvent':
            return event.payload?.pull_request?.html_url || repoUrl;
        case 'IssuesEvent':
            return event.payload?.issue?.html_url || repoUrl;
        case 'ReleaseEvent':
            return event.payload?.release?.html_url || repoUrl;
        default:
            return repoUrl;
    }
}

function formatRelativeDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const diffMs = date.getTime() - Date.now();
    const absDiff = Math.abs(diffMs);
    const units = [
        ['year', 1000 * 60 * 60 * 24 * 365],
        ['month', 1000 * 60 * 60 * 24 * 30],
        ['day', 1000 * 60 * 60 * 24],
        ['hour', 1000 * 60 * 60],
        ['minute', 1000 * 60],
    ];
    for (const [unit, value] of units) {
        if (absDiff >= value) {
            const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
            return formatter.format(Math.round(diffMs / value), unit);
        }
    }
    return 'just now';
}

function formatNumber(value) {
    if (value === undefined || value === null) return '—';
    if (value < 1000) return String(value);
    return `${(value / 1000).toFixed(1)}k`;
}

function capitalize(value = '') {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function showProjectsError() {
    const grid = document.getElementById('project-grid');
    if (grid) {
        grid.innerHTML = '<p class="muted">Rate limited by GitHub. Try refreshing in a minute.</p>';
    }
}

function showActivityError() {
    const container = document.getElementById('activity-list');
    if (container) {
        container.innerHTML = '<p class="muted">Could not load activity right now. GitHub might be throttling requests.</p>';
    }
}

function showConfigReminder() {
    const message = 'Set `SITE_CONFIG.githubUsername` in `script.js` to enable live GitHub data.';
    const grid = document.getElementById('project-grid');
    const timeline = document.getElementById('activity-list');
    if (grid) grid.innerHTML = `<p class="muted">${message}</p>`;
    if (timeline) timeline.innerHTML = `<p class="muted">${message}</p>`;
}

function initSnow() {
    const snowContainer = document.querySelector('.snow-container');
    if (!snowContainer) return;

    const snowflakes = ['❄', '❅', '❆', '✻', '✼', '✦', '✧'];
    const flakeCount = 80;

    for (let i = 0; i < flakeCount; i++) {
        setTimeout(() => {
            createSnowflake(snowContainer, snowflakes);
        }, i * 50);
    }

    setInterval(() => {
        if (snowContainer.children.length < flakeCount) {
            createSnowflake(snowContainer, snowflakes);
        }
    }, 500);
}

function createSnowflake(container, snowflakes) {
    const flake = document.createElement('div');
    const isHighlighted = Math.random() < 0.15;
    flake.className = isHighlighted ? 'snowflake highlight' : 'snowflake';
    flake.textContent = snowflakes[Math.floor(Math.random() * snowflakes.length)];
    
    const left = Math.random() * 100;
    const drift = (Math.random() - 0.5) * 80;
    const duration = Math.random() * 5 + 8;
    const delay = Math.random() * 2;
    const size = isHighlighted ? Math.random() * 8 + 20 : Math.random() * 12 + 14;
    
    flake.style.left = left + '%';
    flake.style.setProperty('--drift', drift + 'px');
    flake.style.animationDuration = duration + 's';
    flake.style.animationDelay = delay + 's';
    flake.style.fontSize = size + 'px';
    flake.style.opacity = isHighlighted ? Math.random() * 0.2 + 0.8 : Math.random() * 0.3 + 0.7;
    flake.style.zIndex = '10000';
    
    container.appendChild(flake);
    
    setTimeout(() => {
        if (flake.parentNode) {
            flake.remove();
        }
    }, (duration + delay) * 1000);
}

function initMusicPlayer() {
    const musicToggle = document.getElementById('music-toggle');
    const audio = document.getElementById('background-music');
    
    if (!musicToggle || !audio) return;

    audio.play().then(() => {
        musicToggle.classList.add('playing');
        localStorage.setItem('musicPlaying', 'true');
    }).catch(() => {
    });
    
    musicToggle.addEventListener('click', () => {
        if (audio.paused) {
            audio.play().then(() => {
                musicToggle.classList.add('playing');
                localStorage.setItem('musicPlaying', 'true');
            }).catch(() => {
            });
        } else {
            audio.pause();
            musicToggle.classList.remove('playing');
            localStorage.setItem('musicPlaying', 'false');
        }
    });

    audio.addEventListener('play', () => {
        musicToggle.classList.add('playing');
    });

    audio.addEventListener('pause', () => {
        musicToggle.classList.remove('playing');
    });
}

