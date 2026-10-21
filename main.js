// main.js

let allVideos = [];
let currentType = 'all'; // all, video, audio
let currentCategory = 'all';
let currentSearch = '';

// 你的专属下载 Token，必须和子站 index.html 里的 SECRET_TOKEN 保持一致
const DOWNLOAD_TOKEN = 'zms2026';

function getCategoryName(duration) {
    if (duration < 120) return 'short';
    if (duration >= 430) return 'long';
    return Math.floor((duration - 120) / 30) + 1;
}

function getCategoryDisplayName(cat) {
    if (cat === 'all') return '全部时长';
    if (cat === 'short') return '过短 (<2:00)';
    if (cat === 'long') return '过长 (>7:10)';
    return `时长 ${cat} 档`;
}

async function init() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error('网络请求失败');
        const data = await response.json();
        
        allVideos = data.videos || [];
        
        // 自动计算缺失的分类
        allVideos.forEach(video => {
            if (!video.category && video.duration) {
                video.category = getCategoryName(video.duration);
            }
            // 如果没写 type，默认当做视频
            if (!video.type) {
                video.type = 'video';
            }
        });

        const loadingMsg = document.getElementById('loading-msg');
        if (loadingMsg) loadingMsg.style.display = 'none';
        
        renderCategoryNav();
        renderVideoList();

    } catch (error) {
        console.error('读取 data.json 失败:', error);
        const loadingMsg = document.getElementById('loading-msg');
        if (loadingMsg) {
            loadingMsg.innerHTML = '⚠️ 无法加载 data.json，请确认文件存在且格式正确。';
        }
    }
}

function renderCategoryNav() {
    const nav = document.getElementById('category-nav');
    if (!nav) return;
    nav.innerHTML = '';

    // 根据当前选中的类型过滤出可用的分类
    let filteredForCats = allVideos;
    if (currentType !== 'all') {
        filteredForCats = filteredForCats.filter(v => v.type === currentType);
    }

    const categories = new Set(filteredForCats.map(v => v.category));
    const orderedCats = ['all', 'short'];
    
    for (let i = 1; i <= 15; i++) {
        if (categories.has(i) || categories.has(String(i))) orderedCats.push(i);
    }
    if (categories.has('long')) orderedCats.push('long');

    orderedCats.forEach(cat => {
        // 如果当前分类在这个类型下没有数据，可以隐藏或者保留
        if (cat !== 'all' && !categories.has(cat) && !categories.has(Number(cat))) return;

        const btn = document.createElement('button');
        btn.textContent = getCategoryDisplayName(cat);
        btn.dataset.category = cat;
        
        if (String(cat) === String(currentCategory)) btn.classList.add('active');
        
        btn.onclick = () => {
            currentCategory = cat;
            renderCategoryNav(); 
            renderVideoList();
        };
        nav.appendChild(btn);
    });
}

function renderVideoList() {
    const listContainer = document.getElementById('video-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    let filteredVideos = allVideos;
    
    // 1. 类型过滤
    if (currentType !== 'all') {
        filteredVideos = filteredVideos.filter(v => v.type === currentType);
    }

    // 2. 分类过滤
    if (currentCategory !== 'all') {
        filteredVideos = filteredVideos.filter(v => String(v.category) === String(currentCategory));
    }
    
    // 3. 搜索过滤
    if (currentSearch) {
        const keyword = currentSearch.toLowerCase();
        filteredVideos = filteredVideos.filter(v => v.title.toLowerCase().includes(keyword));
    }

    if (filteredVideos.length === 0) {
        listContainer.innerHTML = '<div class="status-msg">没有找到符合条件的媒体文件。</div>';
        return;
    }

    filteredVideos.forEach(video => {
        const card = document.createElement('div');
        card.className = 'card';

        let playUrl = video.url; 
        let downloadUrl = video.url;
        const typeIcon = video.type === 'audio' ? '🎵' : '🎬';
        
        try {
            const urlObj = new URL(video.url);
            const origin = urlObj.origin; 
            const fileName = video.url.split('/').pop(); 

            const descParam = encodeURIComponent(video.description || '暂无简介');
            // 把 type 也传给播放器，播放器可以决定用 video 还是 audio 标签
            playUrl = `${origin}/player.html?url=${encodeURIComponent(video.url)}&title=${encodeURIComponent(video.title)}&desc=${descParam}&type=${video.type}&back=${encodeURIComponent(window.location.href)}`;
            
            downloadUrl = `${origin}/index.html?file=${encodeURIComponent(fileName)}&token=${DOWNLOAD_TOKEN}`;
            
        } catch (e) {
            console.warn('URL 解析失败，使用默认链接:', video.url);
        }

        card.innerHTML = `
            <div>
                <div class="card-title">${typeIcon} ${video.title}</div>
                <div class="card-meta">时长：${video.display || video.duration + '秒'} | 分类：${video.category}</div>
                <div class="card-desc">${video.description || '暂无简介'}</div>
            </div>
            <div class="card-actions">
                <a href="${playUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-play">▶ 播放</a>
                <a href="${downloadUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-download" title="点击在新窗口打开，自动触发下载">⬇ 下载</a>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

// 绑定事件
document.addEventListener('DOMContentLoaded', () => {
    // 搜索框事件
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value.trim();
            renderVideoList();
        });
    }

    // 类型切换事件
    const typeBtns = document.querySelectorAll('.type-btn');
    typeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // 移除所有 active
            typeBtns.forEach(b => b.classList.remove('active'));
            // 加上 active
            e.target.classList.add('active');
            
            currentType = e.target.dataset.type;
            // 切换类型时，重置分类到“全部”
            currentCategory = 'all';
            
            renderCategoryNav();
            renderVideoList();
        });
    });

    // 启动
    init();
});
