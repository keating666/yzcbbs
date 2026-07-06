// ===== AI助手前端代码 =====
// 集成讯飞星火API的AI助手

document.addEventListener('DOMContentLoaded', function() {
  // 创建AI助手HTML结构
  createAIAssistantUI();
  
  // 初始化AI助手功能
  initAIAssistant();
});

// 创建AI助手UI
function createAIAssistantUI() {
  // 创建样式
  const style = document.createElement('style');
  style.textContent = `
    /* AI助手样式 */
    .ai-assistant-bubble {
      position: fixed;
      right: 25px;
      bottom: 25px;
      width: 60px;
      height: 60px;
      background-color: #35b350;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(53, 179, 80, 0.35);
      z-index: 999;
      transition: all 0.3s ease;
      border: none;
    }
    
    .ai-assistant-bubble:hover {
      transform: scale(1.1);
    }
    
    .ai-assistant-bubble i {
      font-size: 24px;
    }
    
    .ai-assistant-container {
      position: fixed;
      right: 25px;
      bottom: 25px;
      width: 380px;
      height: 550px;
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      transition: all 0.3s ease;
      overflow: hidden;
    }
    
    .ai-assistant-container.hidden {
      display: none;
    }
    
    .ai-assistant-header {
      padding: 16px;
      background-color: #35b350;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .ai-assistant-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
    
    .ai-assistant-close {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }
    
    .ai-assistant-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 16px;
      overflow: hidden;
    }
    
    .ai-assistant-messages {
      flex: 1;
      overflow-y: auto;
      margin-bottom: 16px;
      display: flex;
      flex-direction: column;
    }
    
    .ai-message {
      background-color: #f3f4f6;
      color: #333;
      padding: 12px 16px;
      border-radius: 18px 18px 18px 4px;
      margin-bottom: 12px;
      max-width: 85%;
      align-self: flex-start;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
      line-height: 1.5;
      font-size: 14px;
      animation: fadeIn 0.3s ease;
    }
    
    .user-message {
      background-color: #35b350;
      color: white;
      padding: 12px 16px;
      border-radius: 18px 18px 4px 18px;
      margin-bottom: 12px;
      max-width: 85%;
      align-self: flex-end;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
      line-height: 1.5;
      font-size: 14px;
      animation: fadeIn 0.3s ease;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .typing-indicator {
      display: flex;
      align-items: center;
    }
    
    .typing-indicator::after {
      content: '';
      animation: typingDots 1.5s infinite;
    }
    
    @keyframes typingDots {
      0%, 20% { content: '.'; }
      40% { content: '..'; }
      60%, 100% { content: '...'; }
    }
    
    .ai-assistant-input {
      display: flex;
      gap: 8px;
    }
    
    .ai-assistant-textarea {
      flex: 1;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 12px;
      resize: none;
      font-family: inherit;
      font-size: 14px;
      height: 50px;
      max-height: 150px;
      line-height: 1.5;
    }
    
    .ai-assistant-textarea:focus {
      outline: none;
      border-color: #35b350;
      box-shadow: 0 0 0 2px rgba(53, 179, 80, 0.2);
    }
    
    .ai-assistant-send {
      background-color: #35b350;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 0 16px;
      cursor: pointer;
      font-weight: 600;
      transition: background-color 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .ai-assistant-send:hover {
      background-color: #2c9a44;
    }
    
    .ai-assistant-send i {
      font-size: 18px;
    }
    
    /* 快速问题样式 */
    .quick-questions {
      margin: 12px 0;
      padding: 12px;
      background-color: #f8f9fa;
      border-radius: 12px;
      border-left: 4px solid #35b350;
    }
    
    .quick-questions-title {
      font-size: 14px;
      font-weight: 600;
      color: #35b350;
      margin-bottom: 8px;
    }
    
    .quick-question-btn {
      display: block;
      width: 100%;
      margin: 6px 0;
      padding: 8px 12px;
      background-color: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      color: #333;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
    }
    
    .quick-question-btn:hover {
      background-color: #35b350;
      color: white;
      border-color: #35b350;
      transform: translateY(-1px);
    }
  `;
  document.head.appendChild(style);
  
  // 创建AI助手容器
  const container = document.createElement('div');
  container.className = 'ai-assistant-container hidden';
  container.id = 'ai-assistant-container';
  container.innerHTML = `
    <div class="ai-assistant-header">
      <h3>预制菜AI助手</h3>
      <button class="ai-assistant-close" id="ai-assistant-close">&times;</button>
    </div>
    <div class="ai-assistant-body">
      <div class="ai-assistant-messages" id="ai-assistant-messages"></div>
      <div class="ai-assistant-input">
        <textarea class="ai-assistant-textarea" id="ai-assistant-textarea" placeholder="请输入您的问题..."></textarea>
        <button class="ai-assistant-send" id="ai-assistant-send">
          <i class="fas fa-paper-plane"></i>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(container);
  
  // 确保Font Awesome加载
  if (!document.querySelector('link[href*="font-awesome"]')) {
    const fontAwesome = document.createElement('link');
    fontAwesome.rel = 'stylesheet';
    fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fontAwesome);
  }
}

// 初始化AI助手功能
function initAIAssistant() {
  // 定义变量
  const chatButton = document.getElementById('chat-button'); // 使用现有的按钮
  const container = document.getElementById('ai-assistant-container');
  const closeBtn = document.getElementById('ai-assistant-close');
  const messagesDiv = document.getElementById('ai-assistant-messages');
  const textArea = document.getElementById('ai-assistant-textarea');
  const sendBtn = document.getElementById('ai-assistant-send');
  
  let history = [];
  let isTyping = false;
  
  // 处理打开助手 - 使用现有的按钮
  chatButton.addEventListener('click', function() {
    container.classList.remove('hidden');
    
    // 如果是第一次打开，显示欢迎消息和预设问题
    if (messagesDiv.children.length === 0) {
      addMessage('您好！我是预制菜百宝书AI助手，专门为您解答预制菜行业相关问题。您可以问我：', 'ai');
      
      // 添加预设问题按钮
      setTimeout(() => {
        addQuickQuestions();
      }, 500);
    }
    
    // 聚焦输入框
    textArea.focus();
  });
  
  // 处理关闭助手
  closeBtn.addEventListener('click', function() {
    container.classList.add('hidden');
  });
  
  // 发送消息 - 点击按钮
  sendBtn.addEventListener('click', sendMessage);
  
  // 发送消息 - 按Enter键（不按Shift）
  textArea.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // 输入框自动调整高度
  textArea.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 150) + 'px';
  });
  
  // 添加快速问题按钮
  function addQuickQuestions() {
    const quickQuestions = [
      '预制菜市场前景如何？',
      '预制菜的生产流程是什么？',
      '如何选择优质的预制菜供应商？',
      '预制菜行业有哪些发展趋势？'
    ];
    
    const quickDiv = document.createElement('div');
    quickDiv.className = 'quick-questions';
    quickDiv.innerHTML = `
      <div class="quick-questions-title">💡 常见问题：</div>
      ${quickQuestions.map(q => `<button class="quick-question-btn">${q}</button>`).join('')}
    `;
    
    messagesDiv.appendChild(quickDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    // 绑定快速问题点击事件
    quickDiv.querySelectorAll('.quick-question-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const question = this.textContent;
        textArea.value = question;
        sendMessage();
        quickDiv.remove(); // 移除快速问题
      });
    });
  }

  // 添加消息到聊天界面（支持打字机效果）
  function addMessage(text, sender, useTypewriter = false) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add(sender === 'user' ? 'user-message' : 'ai-message');
    
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    if (useTypewriter && sender === 'ai') {
      // 打字机效果
      let i = 0;
      let isSkipped = false;
      
      // 添加跳过提示
      messageDiv.style.cursor = 'pointer';
      messageDiv.title = '点击跳过打字效果';
      
      const typeWriter = () => {
        if (isSkipped || i >= text.length) {
          // 显示完整内容
          messageDiv.innerHTML = text.replace(/\n/g, '<br>');
          messageDiv.style.cursor = 'default';
          messageDiv.title = '';
          if (sender === 'ai') {
            history.push({ role: 'assistant', content: text });
          }
          return;
        }
        
        messageDiv.innerHTML = text.slice(0, i + 1).replace(/\n/g, '<br>');
        i++;
        setTimeout(typeWriter, 15); // 更快的打字速度
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      };
      
      // 点击跳过打字效果
      messageDiv.addEventListener('click', function() {
        if (!isSkipped) {
          isSkipped = true;
        }
      });
      
      typeWriter();
    } else {
      // 普通显示
      text = text.replace(/\n/g, '<br>');
      messageDiv.innerHTML = text;
      
      // 添加到历史记录
      if (sender === 'user') {
        history.push({ role: 'user', content: text });
      } else if (sender === 'ai' && !messageDiv.classList.contains('typing-indicator')) {
        history.push({ role: 'assistant', content: text });
      }
    }
    
    // 限制历史记录长度，防止过长
    if (history.length > 10) {
      history = history.slice(-10);
    }
  }
  
  // 显示正在输入指示器
  function showTypingIndicator() {
    if (isTyping) return;
    
    isTyping = true;
    const typingIndicator = document.createElement('div');
    typingIndicator.classList.add('ai-message', 'typing-indicator');
    typingIndicator.textContent = '正在思考';
    typingIndicator.id = 'typing-indicator';
    messagesDiv.appendChild(typingIndicator);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
  
  // 隐藏正在输入指示器
  function hideTypingIndicator() {
    isTyping = false;
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
      messagesDiv.removeChild(typingIndicator);
    }
  }
  
  // 发送消息到API并处理响应
  async function sendMessage() {
    const message = textArea.value.trim();
    if (!message || isTyping) return;
    
    // 清空输入框并重置高度
    textArea.value = '';
    textArea.style.height = '50px';
    
    // 显示用户消息
    addMessage(message, 'user');
    
    // 显示正在输入指示
    showTypingIndicator();
    
    try {
      // 准备请求数据
      const requestData = {
        message: message,
        history: history.slice(0, -1) // 不包括刚刚添加的用户消息
      };
      
      // API路径 - 修改为使用相对路径
      const apiPath = './api/spark_api_proxy.php'; // 或其他相对路径
      
      // 检查API是否存在（先发送HEAD请求）
      try {
        const checkResponse = await fetch(apiPath, { method: 'HEAD' });
        if (!checkResponse.ok) {
          // API不存在，显示错误
          throw new Error(`API不可用 (${checkResponse.status}): 请确认服务器端文件路径正确`);
        }
      } catch (checkError) {
        // 网络错误或API不存在
        console.error('API检查失败:', checkError);
        throw new Error('无法连接到API服务: ' + checkError.message);
      }
      
      // 发送API请求到代理
      const response = await fetch(apiPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      // 检查响应状态
      if (!response.ok) {
        throw new Error(`服务器返回错误 (${response.status}): ${response.statusText}`);
      }
      
      // 检查内容类型
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`服务器返回非JSON响应: ${contentType}`);
      }
      
      // 解析响应
      const data = await response.json();
      
      // 隐藏输入指示器
      hideTypingIndicator();
      
      // 处理响应
      if (data.success) {
        // 显示AI回复（使用打字机效果）
        addMessage(data.response, 'ai', true);
      } else {
        throw new Error(data.error || '请求失败');
      }
    } catch (error) {
      console.error('AI助手错误:', error);
      
      // 隐藏输入指示器
      hideTypingIndicator();
      
      // 显示更详细的错误消息
      addMessage(`抱歉，我暂时无法回答您的问题。技术原因: ${error.message}`, 'ai');
      
      // 在开发环境下提供更多错误信息
      console.log('完整错误信息:', error);
    }
  }
}