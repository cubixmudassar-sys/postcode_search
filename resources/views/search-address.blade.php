<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Canada Address Search</title>
    <style>
        :root {
            color-scheme: light;
            --bg: #f4f6f8;
            --card: #ffffff;
            --border: #d7dee7;
            --text: #1f2933;
            --muted: #6b7280;
            --accent: #c8102e;
            --shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            min-height: 100vh;
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(180deg, #eef2f6 0%, var(--bg) 100%);
            color: var(--text);
        }

        .page {
            max-width: 720px;
            margin: 0 auto;
            padding: 48px 20px 64px;
        }

        .card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 16px;
            box-shadow: var(--shadow);
            padding: 28px;
        }

        h1 {
            margin: 0 0 8px;
            font-size: 1.75rem;
        }

        .lede {
            margin: 0 0 24px;
            color: var(--muted);
            line-height: 1.5;
        }

        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
        }

        .hint {
            display: none;
            margin-bottom: 8px;
            padding: 8px 12px;
            border-radius: 8px;
            background: #eef2f7;
            color: var(--muted);
            font-size: 0.875rem;
        }

        .hint.visible {
            display: block;
        }

        .field-wrap {
            position: relative;
        }

        input[type="text"] {
            width: 100%;
            padding: 14px 16px;
            border: 1px solid var(--border);
            border-radius: 10px;
            font-size: 1rem;
            outline: none;
            transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        input[type="text"]:focus {
            border-color: #9aa8b8;
            box-shadow: 0 0 0 3px rgba(200, 16, 46, 0.12);
        }

        .suggestions {
            display: none;
            position: absolute;
            z-index: 20;
            top: calc(100% + 6px);
            left: 0;
            right: 0;
            margin: 0;
            padding: 0;
            list-style: none;
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 12px;
            box-shadow: var(--shadow);
            overflow: hidden;
        }

        .suggestions.open {
            display: block;
        }

        .suggestions li {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 12px 16px;
            border-bottom: 1px solid #edf1f5;
            cursor: pointer;
        }

        .suggestions li:last-child {
            border-bottom: 0;
        }

        .suggestions li:hover,
        .suggestions li.active {
            background: #f8fafc;
        }

        .suggestion-main {
            min-width: 0;
        }

        .suggestion-text {
            display: block;
            font-weight: 600;
            line-height: 1.35;
        }

        .suggestion-text mark {
            background: transparent;
            color: inherit;
            font-weight: 800;
        }

        .suggestion-count {
            color: var(--muted);
            font-weight: 500;
        }

        .chevron {
            color: var(--muted);
            font-size: 1.1rem;
            flex-shrink: 0;
        }

        .footer-brand {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 10px 16px;
            border-top: 1px solid #edf1f5;
            background: #fafbfc;
            color: var(--muted);
            font-size: 0.8rem;
        }

        .brand {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            color: var(--text);
        }

        .brand-dot {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: var(--accent);
            color: #fff;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 0.7rem;
            font-weight: 700;
        }

        .error {
            display: none;
            margin-top: 12px;
            padding: 10px 12px;
            border-radius: 8px;
            background: #fef2f2;
            color: #991b1b;
            border: 1px solid #fecaca;
        }

        .error.visible {
            display: block;
        }

        .selected {
            display: none;
            margin-top: 20px;
            padding: 16px;
            border-radius: 12px;
            background: #f8fafc;
            border: 1px solid var(--border);
        }

        .selected.visible {
            display: block;
        }

        .selected h2 {
            margin: 0 0 10px;
            font-size: 1rem;
        }

        .selected pre {
            margin: 0;
            white-space: pre-wrap;
            font-family: inherit;
            line-height: 1.5;
        }

        .status {
            margin-top: 10px;
            min-height: 1.25rem;
            color: var(--muted);
            font-size: 0.875rem;
        }
    </style>
</head>
<body>
    <main class="page">
        <section class="card">
            <h1>Canada address search</h1>
            <p class="lede">
                Type a Canadian address or postal code. Suggestions appear as you type.
                Street groups can be opened to choose a specific address.
            </p>

            <label for="address-search">Address or postal code</label>
            <div id="typing-hint" class="hint">Keep typing your address to display more results.</div>

            <div class="field-wrap">
                <input
                    id="address-search"
                    type="text"
                    autocomplete="off"
                    placeholder="e.g. BC V3K or 123 Main St Toronto"
                    aria-autocomplete="list"
                    aria-controls="address-suggestions"
                    aria-expanded="false"
                >
                <ul id="address-suggestions" class="suggestions" role="listbox"></ul>
            </div>

            <div id="status" class="status" aria-live="polite"></div>
            <div id="error" class="error" role="alert"></div>

            <div id="selected" class="selected">
                <h2>Selected address</h2>
                <pre id="selected-label"></pre>
            </div>
        </section>
    </main>

    <script>
        (() => {
            const findUrl = @json(route('search_address.find'));
            const retrieveUrl = @json(route('search_address.retrieve'));
            const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

            const input = document.getElementById('address-search');
            const list = document.getElementById('address-suggestions');
            const hint = document.getElementById('typing-hint');
            const status = document.getElementById('status');
            const errorBox = document.getElementById('error');
            const selected = document.getElementById('selected');
            const selectedLabel = document.getElementById('selected-label');

            let debounceTimer = null;
            let activeIndex = -1;
            let currentItems = [];
            let suppressSearch = false;
            let requestSeq = 0;

            function setError(message) {
                if (!message) {
                    errorBox.textContent = '';
                    errorBox.classList.remove('visible');
                    return;
                }

                errorBox.textContent = message;
                errorBox.classList.add('visible');
            }

            function setStatus(message) {
                status.textContent = message || '';
            }

            function closeSuggestions() {
                list.classList.remove('open');
                list.innerHTML = '';
                input.setAttribute('aria-expanded', 'false');
                activeIndex = -1;
                currentItems = [];
                hint.classList.remove('visible');
            }

            function highlightWithRanges(text, highlight) {
                const safeText = String(text ?? '');
                const ranges = String(highlight ?? '')
                    .split(',')
                    .map((part) => part.trim())
                    .filter(Boolean)
                    .map((part) => {
                        const [startRaw, endRaw] = part.split('-');
                        const start = Number(startRaw);
                        const end = Number(endRaw);

                        if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start) {
                            return null;
                        }

                        return { start, end };
                    })
                    .filter(Boolean)
                    .sort((a, b) => a.start - b.start);

                if (!ranges.length) {
                    return null;
                }

                let html = '';
                let cursor = 0;

                ranges.forEach((range) => {
                    const start = Math.min(range.start, safeText.length);
                    const end = Math.min(range.end + 1, safeText.length);

                    if (start < cursor) {
                        return;
                    }

                    html += escapeHtml(safeText.slice(cursor, start));
                    html += `<mark>${escapeHtml(safeText.slice(start, end))}</mark>`;
                    cursor = end;
                });

                html += escapeHtml(safeText.slice(cursor));

                return html;
            }

            function highlightMatch(text, query) {
                const safeText = String(text ?? '');
                const safeQuery = String(query ?? '').trim();

                if (!safeQuery) {
                    return escapeHtml(safeText);
                }

                const lowerText = safeText.toLowerCase();
                const lowerQuery = safeQuery.toLowerCase();
                const index = lowerText.indexOf(lowerQuery);

                if (index === -1) {
                    return escapeHtml(safeText);
                }

                const before = escapeHtml(safeText.slice(0, index));
                const match = escapeHtml(safeText.slice(index, index + safeQuery.length));
                const after = escapeHtml(safeText.slice(index + safeQuery.length));

                return `${before}<mark>${match}</mark>${after}`;
            }

            function escapeHtml(value) {
                return String(value)
                    .replaceAll('&', '&amp;')
                    .replaceAll('<', '&lt;')
                    .replaceAll('>', '&gt;')
                    .replaceAll('"', '&quot;')
                    .replaceAll("'", '&#39;');
            }

            function formatSuggestionHtml(item, query) {
                const text = String(item.Text || '');
                const description = String(item.Description || '').trim();
                const highlightedText = highlightWithRanges(text, item.Highlight)
                    || highlightMatch(text, query);

                if (!description) {
                    return highlightedText;
                }

                return `${highlightedText} <span class="suggestion-count">- ${escapeHtml(description)}</span>`;
            }

            function renderSuggestions(items, query) {
                currentItems = items;
                activeIndex = -1;
                list.innerHTML = '';

                if (!items.length) {
                    closeSuggestions();
                    return;
                }

                items.forEach((item, index) => {
                    const li = document.createElement('li');
                    li.setAttribute('role', 'option');
                    li.dataset.index = String(index);

                    const main = document.createElement('div');
                    main.className = 'suggestion-main';

                    const text = document.createElement('span');
                    text.className = 'suggestion-text';
                    text.innerHTML = formatSuggestionHtml(item, query);

                    main.appendChild(text);
                    li.appendChild(main);

                    if (String(item.Next || '').toLowerCase() === 'find') {
                        const chevron = document.createElement('span');
                        chevron.className = 'chevron';
                        chevron.setAttribute('aria-hidden', 'true');
                        chevron.textContent = '›';
                        li.appendChild(chevron);
                    }

                    li.addEventListener('mousedown', (event) => {
                        event.preventDefault();
                        selectItem(item);
                    });

                    list.appendChild(li);
                });

                const footer = document.createElement('div');
                footer.className = 'footer-brand';
                footer.innerHTML = `
                    <span class="brand"><span class="brand-dot">P</span> AddressComplete</span>
                    <span>Canada</span>
                `;
                list.appendChild(footer);

                list.classList.add('open');
                input.setAttribute('aria-expanded', 'true');
                hint.classList.add('visible');
            }

            async function postJson(url, body) {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: JSON.stringify(body),
                });

                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    const message = data.message
                        || data.Message
                        || (data.errors ? Object.values(data.errors).flat().join(' ') : null)
                        || 'Request failed.';
                    throw new Error(message);
                }

                return data;
            }

            async function runFind(search, lastId = '') {
                const seq = ++requestSeq;
                setError('');
                setStatus(lastId ? 'Loading addresses…' : 'Searching…');

                try {
                    const data = await postJson(findUrl, {
                        search,
                        last_id: lastId || null,
                    });

                    if (seq !== requestSeq) {
                        return;
                    }

                    const items = Array.isArray(data.Items) ? data.Items : [];
                    setStatus(items.length ? `${items.length} suggestion${items.length === 1 ? '' : 's'}` : 'No matches');
                    renderSuggestions(items, search);
                } catch (error) {
                    if (seq !== requestSeq) {
                        return;
                    }

                    closeSuggestions();
                    setStatus('');
                    setError(error.message || 'Search failed.');
                }
            }

            function formatAddress(item) {
                if (item.Label) {
                    return String(item.Label).replace(/\r\n|\n|\r/g, '\n');
                }

                const line1 = item.Line1 || '';
                const city = item.City || '';
                const province = item.Province || item.ProvinceCode || '';
                const postal = item.PostalCode || '';
                const parts = [line1, [city, province, postal].filter(Boolean).join(' ')].filter(Boolean);

                return parts.join(', ');
            }

            async function selectItem(item) {
                const next = String(item.Next || '').toLowerCase();

                if (next === 'find') {
                    setStatus('Opening street…');
                    await runFind(input.value.trim() || item.Text || '', item.Id || '');
                    return;
                }

                setError('');
                setStatus('Retrieving address…');

                try {
                    const data = await postJson(retrieveUrl, { id: item.Id });
                    const address = data.Item || (Array.isArray(data.Items) ? data.Items[0] : null);

                    if (!address) {
                        throw new Error('Sorry, there were no results.');
                    }

                    const label = formatAddress(address);
                    suppressSearch = true;
                    input.value = label.replace(/\n/g, ', ');
                    selectedLabel.textContent = label;
                    selected.classList.add('visible');
                    closeSuggestions();
                    setStatus('Address selected');
                } catch (error) {
                    setError(error.message || 'Retrieve failed.');
                    setStatus('');
                }
            }

            input.addEventListener('input', () => {
                if (suppressSearch) {
                    suppressSearch = false;
                    return;
                }

                const value = input.value.trim();
                clearTimeout(debounceTimer);
                selected.classList.remove('visible');

                if (value.length < 2) {
                    requestSeq += 1;
                    closeSuggestions();
                    setStatus('');
                    setError('');
                    return;
                }

                debounceTimer = setTimeout(() => {
                    runFind(value);
                }, 300);
            });

            input.addEventListener('keydown', (event) => {
                if (!list.classList.contains('open') || !currentItems.length) {
                    return;
                }

                const options = Array.from(list.querySelectorAll('li[role="option"]'));

                if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    activeIndex = (activeIndex + 1) % options.length;
                } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    activeIndex = activeIndex <= 0 ? options.length - 1 : activeIndex - 1;
                } else if (event.key === 'Enter' && activeIndex >= 0) {
                    event.preventDefault();
                    selectItem(currentItems[activeIndex]);
                    return;
                } else if (event.key === 'Escape') {
                    closeSuggestions();
                    return;
                } else {
                    return;
                }

                options.forEach((option, index) => {
                    option.classList.toggle('active', index === activeIndex);
                });
            });

            document.addEventListener('click', (event) => {
                if (!event.target.closest('.field-wrap')) {
                    closeSuggestions();
                }
            });
        })();
    </script>
</body>
</html>
