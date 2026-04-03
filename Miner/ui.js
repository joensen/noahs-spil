// ===== UI — TOOLBAR & MESSAGES =====
import { TOOLBAR_SLOTS, TOOLS } from './constants.js';
import { inventory, toolInventory, toolbar, selectedSlot, setSelectedSlot } from './inventory.js';
import { getCachedBlockTexture, drawToolIcon } from './textures.js';

let messageTimer = null;

export function showMessage(text) {
    const el = document.getElementById('message-display');
    el.textContent = text;
    el.classList.add('visible');
    if (messageTimer) clearTimeout(messageTimer);
    messageTimer = setTimeout(() => el.classList.remove('visible'), 2000);
}

export function renderToolbar() {
    const container = document.getElementById('toolbar');
    container.innerHTML = '';

    for (let i = 0; i < TOOLBAR_SLOTS; i++) {
        const slotDiv = document.createElement('div');
        slotDiv.className = 'toolbar-slot' + (i === selectedSlot ? ' selected' : '');
        slotDiv.dataset.slot = i;

        const canvas = document.createElement('canvas');
        canvas.className = 'slot-icon';
        canvas.width = 32; canvas.height = 32;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        const slotData = toolbar[i];
        if (slotData) {
            if (slotData.type === 'block') {
                const texCanvas = getCachedBlockTexture(slotData.item);
                ctx.drawImage(texCanvas, 0, 0, 32, 32);
                const count = inventory[slotData.item] || 0;
                if (count > 0) {
                    const countSpan = document.createElement('span');
                    countSpan.className = 'slot-count';
                    countSpan.textContent = count;
                    slotDiv.appendChild(countSpan);
                }
            } else if (slotData.type === 'tool') {
                drawToolIcon(ctx, slotData.item);
                if (slotData.item !== 'hand' && slotData.toolIndex !== undefined) {
                    const toolEntry = toolInventory[slotData.toolIndex];
                    if (toolEntry) {
                        const toolDef = TOOLS[slotData.item];
                        const pct = (toolEntry.durability / toolDef.durability) * 100;
                        const durDiv = document.createElement('div');
                        durDiv.className = 'slot-durability';
                        const fillDiv = document.createElement('div');
                        fillDiv.className = 'durability-fill';
                        fillDiv.style.width = pct + '%';
                        if (pct < 30) fillDiv.style.background = '#f44336';
                        else if (pct < 60) fillDiv.style.background = '#ff9800';
                        durDiv.appendChild(fillDiv);
                        slotDiv.appendChild(durDiv);
                    }
                }
            }
        }

        slotDiv.appendChild(canvas);

        const keySpan = document.createElement('span');
        keySpan.className = 'slot-key';
        keySpan.textContent = i + 1;
        slotDiv.appendChild(keySpan);

        slotDiv.addEventListener('click', () => {
            setSelectedSlot(i);
            renderToolbar();
        });

        container.appendChild(slotDiv);
    }
}
