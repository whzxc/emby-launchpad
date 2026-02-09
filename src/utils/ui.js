import { CONFIG } from '../config';
import { Utils } from './index';

export const UI = {
    init() {
        Utils.addStyle(`
            /* DOT STYLES */
            .us-dot {
                position: absolute;
                z-index: 9999;
                border-radius: 50%;
                cursor: pointer;
                box-shadow: 0 0 8px rgba(0,0,0,0.5);
                border: 2px solid white;
                transition: transform 0.2s ease, opacity 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0; /* Hide text if any */
            }
            .us-dot:hover { transform: scale(1.15); }
            
            /* Loading: Blue Pulse */
            .us-dot.loading {
                background-color: #01b4e4; /* TMDB Blue */
                animation: us-pulse 1.5s infinite;
                opacity: 0.8;
                border-color: rgba(255,255,255,0.8);
            }
            
            /* Found: Green */
            .us-dot.found {
                background-color: #52B54B; /* Emby Green */
                box-shadow: 0 0 10px rgba(82, 181, 75, 0.8);
            }
            
            /* Not Found or Error: Grey */
            .us-dot.not-found, .us-dot.error {
                background-color: #9e9e9e;
                opacity: 0.7;
            }

            @keyframes us-pulse {
                0% { transform: scale(0.95); opacity: 0.7; }
                50% { transform: scale(1.05); opacity: 1; }
                100% { transform: scale(0.95); opacity: 0.7; }
            }

            /* MODAL STYLES */
            .us-modal-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.6); z-index: 10000;
                display: flex; justify-content: center; align-items: center;
                backdrop-filter: blur(2px);
            }
            .us-modal {
                background: white; width: 500px; max-width: 90%; max-height: 85vh;
                border-radius: 12px; display: flex; flex-direction: column;
                box-shadow: 0 10px 25px rgba(0,0,0,0.3); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                overflow: hidden;
            }
            .us-modal-header {
                padding: 15px 20px; border-bottom: 1px solid #eee;
                display: flex; justify-content: space-between; align-items: center;
                background: #f8f9fa;
            }
            .us-modal-title { font-weight: bold; font-size: 16px; color: #333; }
            .us-modal-close { cursor: pointer; font-size: 20px; color: #999; line-height: 1; }
            .us-modal-close:hover { color: #333; }
            
            .us-modal-body {
                flex: 1; overflow-y: auto; padding: 0;
            }
            
            /* Action Section */
            .us-actions { padding: 20px; border-bottom: 1px solid #eee; text-align: center; }
            .us-status-icon { font-size: 40px; margin-bottom: 10px; display: block; }
            .us-status-text { font-size: 16px; font-weight: bold; margin-bottom: 15px; display: block; }
            
            .us-btn {
                display: inline-block; padding: 8px 16px; border-radius: 6px;
                text-decoration: none; font-size: 14px; font-weight: 500;
                margin: 0 5px; cursor: pointer; border: none; transition: background 0.2s;
            }
            .us-btn-primary { background: #52B54B; color: white; }
            .us-btn-primary:hover { background: #43943d; }
            .us-btn-outline { background: white; color: #333; border: 1px solid #ddd; }
            .us-btn-outline:hover { background: #f5f5f5; }
            .us-btn-search { background: #eef9fd; color: #01b4e4; border: 1px solid #b3e5fc; }
            .us-btn-search:hover { background: #e1f5fe; }

            /* Stepper Logs */
            .us-log-container { padding: 15px 20px; background: #fafafa; }
            .us-log-title { font-size: 13px; font-weight: bold; color: #666; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
            .us-step { display: flex; margin-bottom: 0; position: relative; padding-bottom: 15px; }
            .us-step:last-child { padding-bottom: 0; }
            .us-step::before {
                content: ''; position: absolute; left: 9px; top: 22px; bottom: 0; width: 2px; background: #e0e0e0;
                display: block; z-index: 1;
            }
            .us-step:last-child::before { display: none; }
            
            .us-step-icon {
                width: 20px; height: 20px; border-radius: 50%;
                background: #e0e0e0; color: white; font-size: 10px;
                display: flex; justify-content: center; align-items: center;
                z-index: 2; margin-right: 12px; flex-shrink: 0;
                margin-top: 2px;
            }
            .us-step.done .us-step-icon { background: #52B54B; }
            .us-step.error .us-step-icon { background: #dc3545; }
            .us-step.active .us-step-icon { background: #01b4e4; box-shadow: 0 0 0 3px rgba(1, 180, 228, 0.2); }
            
            .us-step-content { flex: 1; min-width: 0; }
            .us-step-header { font-size: 13px; font-weight: 600; color: #333; display: flex; justify-content: space-between; }
            .us-step-time { font-size: 11px; color: #999; font-weight: normal; }
            
            .us-step-details { font-size: 12px; color: #666; margin-top: 4px; overflow-wrap: break-word; }
            .us-json-view { 
                background: #f1f1f1; padding: 6px; border-radius: 4px; 
                font-family: monospace; white-space: pre-wrap; margin-top: 6px; 
                display: none; border: 1px solid #ddd;
            }
            .us-toggle-details { font-size: 11px; color: #01b4e4; cursor: pointer; margin-left: 5px; text-decoration: underline; }
        `);
    },

    /**
     * Create a standardized status dot.
     * @param {Object} options
     * @param {HTMLElement} options.posterContainer (Optional) Container for absolute positioning
     * @param {HTMLElement} options.titleElement (Optional) Element for relative positioning (left/right)
     * @returns {HTMLElement} The dot element
     */
    createDot(options = {}) {
        const { posterContainer, titleElement } = options;
        const dot = document.createElement('div');
        dot.className = 'us-dot loading';
        dot.title = 'Initializing...';

        // Config: poster_tl, poster_tr, poster_bl, poster_br, title_left, title_right, auto
        let configPos = CONFIG.state.dotPosition || 'auto';

        // 1. Resolve 'auto' logic
        if (configPos === 'auto') {
            if (posterContainer) configPos = 'poster_tl';
            else configPos = 'title_left';
        }

        // 2. Resolve Fallback Logic (e.g. user forced poster but no poster provided)
        if (configPos.startsWith('poster_') && !posterContainer) {
            configPos = 'title_left';
        }

        const isTitlePos = configPos === 'title_left' || configPos === 'title_right';

        // 1. Determine Sizing & Styling based on Context
        if (isTitlePos && titleElement) {
            // TITLE CONTEXT: Inline flow
            dot.style.position = 'relative';
            dot.style.display = 'inline-block';
            dot.style.verticalAlign = 'middle';

            // Match font-ish size (fixed for consistency, but smaller)
            dot.style.width = '12px';
            dot.style.height = '12px';
            dot.style.marginTop = '-2px';

            // Remove heavy borders/shadows for inline look
            dot.style.boxShadow = 'none';
            dot.style.border = '1px solid rgba(0,0,0,0.1)';

        } else if (posterContainer) {
            // POSTER CONTEXT: Absolute, Adaptive but Smaller, Close to Edge
            const rect = posterContainer.getBoundingClientRect();
            // Smaller adaptive: 10% instead of 15%, max 24px
            const adaptive = Math.round(rect.width * 0.10);
            const size = Math.max(10, Math.min(20, adaptive));

            dot.style.width = `${size}px`;
            dot.style.height = `${size}px`;
            dot.style.position = 'absolute';
            dot.style.zIndex = '99'; // High z-index

            // Ensure container has relative positioning
            const computed = window.getComputedStyle(posterContainer);
            if (computed.position === 'static') posterContainer.style.position = 'relative';

            // Closer to edge: 4px or 5%
            const margin = Math.max(4, Math.round(rect.width * 0.03)) + 'px';

            switch (configPos) {
                case 'poster_tr': dot.style.top = margin; dot.style.right = margin; break;
                case 'poster_bl': dot.style.bottom = margin; dot.style.left = margin; break;
                case 'poster_br': dot.style.bottom = margin; dot.style.right = margin; break;
                case 'poster_tl':
                default: dot.style.top = margin; dot.style.left = margin; break;
            }
        } else {
            console.warn('UI.createDot: No valid container found.');
            return dot;
        }

        // 2. Append to DOM
        if (isTitlePos && titleElement) {
            // Insert into flow
            if (configPos === 'title_right') {
                titleElement.parentNode.insertBefore(dot, titleElement.nextSibling);
                dot.style.marginLeft = '6px';
            } else {
                titleElement.parentNode.insertBefore(dot, titleElement);
                dot.style.marginRight = '6px';
            }
        } else if (posterContainer) {
            posterContainer.appendChild(dot);
        }

        return dot;
    },

    /**
     * Show the Detail Modal.
     * @param {String} title
     * @param {Array} logs - Step logs [{time, step, data}]
     * @param {Object|null} embyItem
     * @param {Array} searchQueries - Strings to search
     */
    showDetailModal(title, logs, embyItem = null, searchQueries = []) {
        const id = 'us-detail-modal';
        const existing = document.getElementById(id);
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = id;
        overlay.className = 'us-modal-overlay';

        // Close on overlay click
        overlay.onclick = (e) => {
            if (e.target === overlay) overlay.remove();
        };

        // Calculate Status
        const isFound = !!embyItem;
        const isError = logs.some(l => l.step === 'Error');
        let statusIcon = isFound ? '✅' : (isError ? '⚠️' : '❌');
        let statusText = isFound ? `Found: ${embyItem.Name}` : 'Not Found in Library';
        let statusColor = isFound ? '#52B54B' : (isError ? '#ffc107' : '#9e9e9e');

        // Generate Steps HTML
        const stepsHtml = logs.map((l, index) => {
            const isLast = index === logs.length - 1;
            const statusClass = (l.step === 'Error') ? 'error' : 'done';
            let detailHtml = '';

            if (l.data) {
                const isObj = typeof l.data === 'object';
                const displayData = isObj ? JSON.stringify(l.data, null, 2) : l.data;
                const shortData = isObj ? 'View Details' : (String(l.data).substring(0, 50) + (String(l.data).length > 50 ? '...' : ''));

                detailHtml = `
                <div class="us-step-details">
                    ${!isObj ? displayData : `<span class="us-toggle-details" onclick="this.parentElement.nextElementSibling.style.display = this.parentElement.nextElementSibling.style.display === 'block' ? 'none' : 'block'">Show JSON</span>`}
                </div>
                ${isObj ? `<div class="us-json-view">${displayData}</div>` : ''}
            `;
            }

            return `
            <div class="us-step ${statusClass}">
                <div class="us-step-icon">${index + 1}</div>
                <div class="us-step-content">
                    <div class="us-step-header">
                        <span>${l.step}</span>
                        <span class="us-step-time">${l.time}</span>
                    </div>
                    ${detailHtml}
                </div>
            </div>
        `;
        }).join('');

        // Generate Actions
        let actionsHtml = '';

        if (isFound) {
            const embyLink = `${CONFIG.emby.server}/web/index.html#!/item?id=${embyItem.Id}&serverId=${embyItem.ServerId}`;
            actionsHtml += `<a href="${embyLink}" target="_blank" class="us-btn us-btn-primary">▶ Play on Emby</a>`;
        }

        if (!isFound) {
            searchQueries.forEach(q => {
                if (!q) return;
                // GYG
                actionsHtml += `<a href="https://www.gyg.si/s/1---1/${encodeURIComponent(q)}" target="_blank" class="us-btn us-btn-search">Search GYG</a>`;
                // BT4G
                actionsHtml += `<a href="https://bt4gprx.com/search?orderby=size&p=1&q=${encodeURIComponent(q)}" target="_blank" class="us-btn us-btn-search">Search BT4G</a>`;
            });
        }


        overlay.innerHTML = `
        <div class="us-modal">
            <div class="us-modal-header">
                <div class="us-modal-title">${title}</div>
                <div class="us-modal-close" onclick="document.getElementById('${id}').remove()">&times;</div>
            </div>
            
            <div class="us-modal-body">
                <div class="us-actions">
                    <span class="us-status-icon">${statusIcon}</span>
                    <span class="us-status-text" style="color:${statusColor}">${statusText}</span>
                    <div>${actionsHtml}</div>
                </div>
                
                <div class="us-log-container">
                    <div class="us-log-title">Process Log</div>
                    ${stepsHtml}
                </div>
            </div>
            
            <div style="padding:15px; background:#f8f9fa; text-align:right; border-top:1px solid #eee;">
                 <button class="us-btn us-btn-outline" onclick="document.getElementById('${id}').remove()">Close</button>
            </div>
        </div>
    `;

        document.body.appendChild(overlay);
    }
};
