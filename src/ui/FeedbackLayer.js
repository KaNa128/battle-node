// 反馈层：飘字提示与结果展示，不参与逻辑计算。

export class FeedbackLayer {
  constructor({ container }) {
    this.container = container;
  }

  toast(text, tone = 'info') {
    if (!text) return;
    const el = document.createElement('div');
    el.className = `feedback-toast feedback-toast--${tone}`;
    el.textContent = text;
    this.container.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }
}
