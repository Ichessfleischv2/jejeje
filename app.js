/* ===== WebhookSend — app.js ===== */

// ---- State ----
let embedFields = [];
let fieldIdCounter = 0;

// ---- DOM refs ----
const $ = id => document.getElementById(id);

const webhookUrl   = $('webhookUrl');
const username     = $('username');
const avatarUrl    = $('avatarUrl');
const msgContent   = $('msgContent');
const contentCount = $('contentCount');
const embedToggle  = $('embedToggle');
const embedFields_ = $('embedFields');
const authorName   = $('authorName');
const authorUrl    = $('authorUrl');
const authorIcon   = $('authorIcon');
const embedTitle   = $('embedTitle');
const embedTitleUrl= $('embedTitleUrl');
const embedDesc    = $('embedDesc');
const descCount    = $('descCount');
const embedColor   = $('embedColor');
const embedColorHex= $('embedColorHex');
const embedImage   = $('embedImage');
const embedThumb   = $('embedThumb');
const footerText   = $('footerText');
const footerIcon   = $('footerIcon');
const embedTimestamp=$('embedTimestamp');
const embedFieldsList=$('embedFieldsList');
const jsonOutput   = $('jsonOutput');
const sendBtn      = $('sendBtn');
const clearAllBtn  = $('clearAllBtn');
const copyJsonBtn  = $('copyJsonBtn');
const addFieldBtn  = $('addFieldBtn');
const statusToast  = $('statusToast');

// Preview refs
const previewEmpty   = $('previewEmpty');
const previewMessage = $('previewMessage');
const previewAvatar  = $('previewAvatar');
const previewUsername= $('previewUsername');
const previewTime    = $('previewTime');
const previewContent = $('previewContent');
const previewEmbed   = $('previewEmbed');
const embedColorBar  = $('embedColorBar');
const previewAuthor  = $('previewAuthor');
const previewAuthorIcon=$('previewAuthorIcon');
const previewAuthorName=$('previewAuthorName');
const previewTitle   = $('previewTitle');
const previewDesc    = $('previewDesc');
const previewFields  = $('previewFields');
const previewImage   = $('previewImage');
const previewThumb   = $('previewThumb');
const previewFooter  = $('previewFooter');
const previewFooterIcon=$('previewFooterIcon');
const previewFooterText=$('previewFooterText');
const previewFooterSep =$('previewFooterSep');
const previewFooterTs  =$('previewFooterTs');

// ---- MARKDOWN RENDERER (basic Discord subset) ----
function renderMarkdown(text) {
  if (!text) return '';
  let t = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // Code blocks (``` ... ```)
  t = t.replace(/```([\s\S]*?)```/g, '<code>$1</code>');
  // Inline code
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic * or _
  t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
  t = t.replace(/_(.+?)_/g, '<em>$1</em>');
  // Underline
  t = t.replace(/__(.+?)__/g, '<u>$1</u>');
  // Strikethrough
  t = t.replace(/~~(.+?)~~/g, '<s>$1</s>');
  // URLs → links
  t = t.replace(/(https?:\/\/[^\s<>"]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  return t;
}

// ---- UPDATE PREVIEW ----
function updatePreview() {
  const hasContent = msgContent.value.trim() !== '';
  const hasEmbed = embedToggle.checked && hasAnyEmbed();
  const hasAnything = hasContent || hasEmbed || username.value.trim() !== '';

  // Show/hide
  previewEmpty.classList.toggle('hidden', hasAnything);
  previewMessage.classList.toggle('hidden', !hasAnything);

  // Time
  previewTime.textContent = formatTime(new Date());

  // Username
  const uName = username.value.trim() || 'Webhook';
  previewUsername.textContent = uName;

  // Avatar
  const av = avatarUrl.value.trim();
  previewAvatar.innerHTML = av
    ? `<img src="${escAttr(av)}" alt="" onerror="this.style.display='none'" />`
    : defaultAvatar();

  // Content
  previewContent.innerHTML = renderMarkdown(msgContent.value);

  // Embed
  if (embedToggle.checked && hasAnyEmbed()) {
    previewEmbed.classList.remove('hidden');
    renderEmbedPreview();
  } else {
    previewEmbed.classList.add('hidden');
  }

  // JSON
  updateJSON();
}

function hasAnyEmbed() {
  return !!(
    authorName.value || embedTitle.value || embedDesc.value ||
    footerText.value || embedImage.value || embedThumb.value ||
    embedFields.some(f => f.name || f.value)
  );
}

function renderEmbedPreview() {
  // Color bar
  const col = embedColor.value || '#5865f2';
  embedColorBar.style.background = col;

  // Author
  const aName = authorName.value.trim();
  if (aName) {
    previewAuthor.classList.remove('hidden');
    previewAuthorName.textContent = aName;
    const aIcon = authorIcon.value.trim();
    if (aIcon) {
      previewAuthorIcon.src = aIcon;
      previewAuthorIcon.classList.remove('hidden');
    } else {
      previewAuthorIcon.classList.add('hidden');
    }
    // Author link
    const aUrl = authorUrl.value.trim();
    previewAuthorName.parentElement.style.cursor = aUrl ? 'pointer' : 'default';
    previewAuthorName.onclick = aUrl ? () => window.open(aUrl, '_blank') : null;
  } else {
    previewAuthor.classList.add('hidden');
  }

  // Title
  const tit = embedTitle.value.trim();
  if (tit) {
    previewTitle.classList.remove('hidden');
    const tUrl = embedTitleUrl.value.trim();
    previewTitle.innerHTML = tUrl
      ? `<a href="${escAttr(tUrl)}" target="_blank" rel="noopener">${escHtml(tit)}</a>`
      : escHtml(tit);
  } else {
    previewTitle.classList.add('hidden');
  }

  // Description
  const desc = embedDesc.value;
  if (desc.trim()) {
    previewDesc.classList.remove('hidden');
    previewDesc.innerHTML = renderMarkdown(desc);
  } else {
    previewDesc.classList.add('hidden');
  }

  // Fields
  previewFields.innerHTML = '';
  const validFields = embedFields.filter(f => f.name || f.value);
  if (validFields.length > 0) {
    // Determine column layout (inline fields share a row)
    let col = 0;
    validFields.forEach((f, i) => {
      const div = document.createElement('div');
      div.className = 'embed-field' + (f.inline ? '' : ' full');
      div.innerHTML = `
        <div class="embed-field-name">${escHtml(f.name)}</div>
        <div class="embed-field-value">${renderMarkdown(f.value)}</div>
      `;
      previewFields.appendChild(div);
    });
    previewFields.style.display = 'grid';
  } else {
    previewFields.style.display = 'none';
  }

  // Image
  const img = embedImage.value.trim();
  if (img) {
    previewImage.src = img;
    previewImage.classList.remove('hidden');
  } else {
    previewImage.classList.add('hidden');
  }

  // Thumbnail
  const th = embedThumb.value.trim();
  if (th) {
    previewThumb.src = th;
    previewThumb.classList.remove('hidden');
  } else {
    previewThumb.classList.add('hidden');
  }

  // Footer
  const fText = footerText.value.trim();
  const fIcon = footerIcon.value.trim();
  const fTs = embedTimestamp.value;
  const hasFooter = fText || fTs;
  if (hasFooter) {
    previewFooter.classList.remove('hidden');
    if (fIcon) {
      previewFooterIcon.src = fIcon;
      previewFooterIcon.classList.remove('hidden');
    } else {
      previewFooterIcon.classList.add('hidden');
    }
    previewFooterText.textContent = fText;
    if (fTs) {
      previewFooterTs.textContent = formatTime(new Date(fTs));
      previewFooterSep.classList.toggle('hidden', !fText);
    } else {
      previewFooterTs.textContent = '';
      previewFooterSep.classList.add('hidden');
    }
  } else {
    previewFooter.classList.add('hidden');
  }
}

// ---- BUILD JSON PAYLOAD ----
function buildPayload() {
  const payload = {};

  const uName = username.value.trim();
  if (uName) payload.username = uName;

  const av = avatarUrl.value.trim();
  if (av) payload.avatar_url = av;

  const content = msgContent.value;
  if (content) payload.content = content;

  if (embedToggle.checked && hasAnyEmbed()) {
    const embed = {};

    const aName = authorName.value.trim();
    if (aName) {
      embed.author = { name: aName };
      if (authorUrl.value.trim()) embed.author.url = authorUrl.value.trim();
      if (authorIcon.value.trim()) embed.author.icon_url = authorIcon.value.trim();
    }

    const tit = embedTitle.value.trim();
    if (tit) embed.title = tit;
    if (embedTitleUrl.value.trim()) embed.url = embedTitleUrl.value.trim();

    const desc = embedDesc.value.trim();
    if (desc) embed.description = desc;

    // Color: convert hex to int
    const hexCol = embedColor.value;
    if (hexCol) embed.color = parseInt(hexCol.replace('#', ''), 16);

    const validFields = embedFields.filter(f => f.name || f.value);
    if (validFields.length > 0) {
      embed.fields = validFields.map(f => ({
        name: f.name || '\u200b',
        value: f.value || '\u200b',
        inline: f.inline
      }));
    }

    if (embedImage.value.trim()) embed.image = { url: embedImage.value.trim() };
    if (embedThumb.value.trim()) embed.thumbnail = { url: embedThumb.value.trim() };

    const fText = footerText.value.trim();
    const fTs = embedTimestamp.value;
    if (fText || footerIcon.value.trim()) {
      embed.footer = {};
      if (fText) embed.footer.text = fText;
      if (footerIcon.value.trim()) embed.footer.icon_url = footerIcon.value.trim();
    }
    if (fTs) embed.timestamp = new Date(fTs).toISOString();

    payload.embeds = [embed];
  }

  return payload;
}

function updateJSON() {
  jsonOutput.textContent = JSON.stringify(buildPayload(), null, 2);
}

// ---- SEND WEBHOOK ----
async function sendWebhook() {
  const url = webhookUrl.value.trim();
  if (!url) {
    showToast('Please enter a webhook URL', 'error');
    return;
  }
  if (!url.includes('discord.com/api/webhooks/') && !url.includes('discordapp.com/api/webhooks/')) {
    showToast('Invalid Discord webhook URL', 'error');
    return;
  }

  const payload = buildPayload();
  if (!payload.content && !payload.embeds) {
    showToast('Nothing to send — add a message or embed', 'error');
    return;
  }

  sendBtn.disabled = true;
  sendBtn.textContent = 'Sending…';

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok || res.status === 204) {
      showToast('✓ Message sent successfully!', 'success');
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(`Error ${res.status}: ${err.message || 'Failed to send'}`, 'error');
    }
  } catch (e) {
    showToast('Network error — check the URL and try again', 'error');
  } finally {
    sendBtn.disabled = false;
    sendBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Send`;
  }
}

// ---- EMBED FIELDS ----
function addEmbedField() {
  const id = ++fieldIdCounter;
  embedFields.push({ id, name: '', value: '', inline: false });
  renderFieldList();
}

function removeField(id) {
  embedFields = embedFields.filter(f => f.id !== id);
  renderFieldList();
  updatePreview();
}

function renderFieldList() {
  embedFieldsList.innerHTML = '';
  embedFields.forEach((f, idx) => {
    const div = document.createElement('div');
    div.className = 'embed-field-item';
    div.innerHTML = `
      <div class="embed-field-header">
        <span>Field ${idx + 1}</span>
        <button class="btn-danger-sm" onclick="removeField(${f.id})">Remove</button>
      </div>
      <div>
        <label class="field-label">Name</label>
        <input class="input" placeholder="Field name..." value="${escAttr(f.name)}" maxlength="256"
          oninput="updateField(${f.id}, 'name', this.value)" />
      </div>
      <div>
        <label class="field-label">Value</label>
        <textarea class="textarea" rows="2" placeholder="Field value..." maxlength="1024"
          oninput="updateField(${f.id}, 'value', this.value)">${escHtml(f.value)}</textarea>
      </div>
      <div class="field-inline-row">
        <label>
          <input type="checkbox" ${f.inline ? 'checked' : ''}
            onchange="updateField(${f.id}, 'inline', this.checked)" />
          Inline
        </label>
      </div>
    `;
    embedFieldsList.appendChild(div);
  });
}

function updateField(id, key, value) {
  const f = embedFields.find(f => f.id === id);
  if (f) { f[key] = value; updatePreview(); }
}

// ---- COLOR SYNC ----
embedColor.addEventListener('input', () => {
  embedColorHex.value = embedColor.value;
  updatePreview();
});

embedColorHex.addEventListener('input', () => {
  const hex = embedColorHex.value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    embedColor.value = hex;
  }
  updatePreview();
});

document.querySelectorAll('.color-preset').forEach(btn => {
  btn.addEventListener('click', () => {
    const col = btn.dataset.color;
    embedColor.value = col;
    embedColorHex.value = col;
    updatePreview();
  });
});

// ---- TOGGLE EMBED ----
embedToggle.addEventListener('change', () => {
  embedFields_.classList.toggle('hidden', !embedToggle.checked);
  updatePreview();
});

// ---- CHAR COUNTERS ----
msgContent.addEventListener('input', () => {
  contentCount.textContent = msgContent.value.length;
  updatePreview();
});

embedDesc.addEventListener('input', () => {
  descCount.textContent = embedDesc.value.length;
  updatePreview();
});

// ---- CLEAR ALL ----
clearAllBtn.addEventListener('click', () => {
  if (!confirm('Clear everything?')) return;
  msgContent.value = '';
  username.value = '';
  avatarUrl.value = '';
  authorName.value = '';
  authorUrl.value = '';
  authorIcon.value = '';
  embedTitle.value = '';
  embedTitleUrl.value = '';
  embedDesc.value = '';
  embedImage.value = '';
  embedThumb.value = '';
  footerText.value = '';
  footerIcon.value = '';
  embedTimestamp.value = '';
  embedColor.value = '#5865f2';
  embedColorHex.value = '#5865f2';
  embedToggle.checked = false;
  embedFields_.classList.add('hidden');
  embedFields = [];
  fieldIdCounter = 0;
  renderFieldList();
  contentCount.textContent = '0';
  descCount.textContent = '0';
  updatePreview();
});

// ---- COPY JSON ----
copyJsonBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(jsonOutput.textContent).then(() => {
    showToast('JSON copied!', 'info');
  });
});

// ---- SEND ----
sendBtn.addEventListener('click', sendWebhook);
addFieldBtn.addEventListener('click', addEmbedField);

// ---- LISTEN TO ALL INPUTS ----
[webhookUrl, username, avatarUrl, authorName, authorUrl, authorIcon,
 embedTitle, embedTitleUrl, embedImage, embedThumb, footerText, footerIcon,
 embedTimestamp].forEach(el => {
  el.addEventListener('input', updatePreview);
});

// ---- TOAST ----
let toastTimeout;
function showToast(msg, type = 'info') {
  clearTimeout(toastTimeout);
  statusToast.textContent = msg;
  statusToast.className = `status-toast ${type}`;
  toastTimeout = setTimeout(() => {
    statusToast.classList.add('hidden');
  }, 4000);
}

// ---- UTILS ----
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(str) {
  return String(str || '').replace(/"/g, '&quot;');
}

function formatTime(d) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function defaultAvatar() {
  return `<svg viewBox="0 0 36 36" fill="none" width="36" height="36">
    <circle cx="18" cy="18" r="18" fill="#5865f2"/>
    <path d="M11 14c2-2 5-3 7-3s5 1 7 3" stroke="white" stroke-width="2" stroke-linecap="round"/>
    <circle cx="14" cy="18" r="2" fill="white"/>
    <circle cx="22" cy="18" r="2" fill="white"/>
    <path d="M14 23c1.5 1.5 6.5 1.5 8 0" stroke="white" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}

// ---- INIT ----
embedColorHex.value = '#5865f2';
updatePreview();

