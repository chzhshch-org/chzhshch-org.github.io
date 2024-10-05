// 获取夜间模式状态
let darkMode = localStorage.getItem('darkMode') === 'enabled';

// 切换夜间模式函数
function toggleDarkMode() {
    darkMode = !darkMode;
    if (darkMode) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'enabled');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', null);
    }
}

// 页面加载时应用保存的模式
function applyDarkMode() {
    if (darkMode) {
        document.body.classList.add('dark-mode');
    }
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 应用保存的模式
    applyDarkMode();

    // 为按钮添加点击事件监听器
    const toggleButton = document.getElementById('toggleMode');
    if (toggleButton) {
        toggleButton.addEventListener('click', toggleDarkMode);
    }
});