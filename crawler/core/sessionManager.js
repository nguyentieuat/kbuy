class CrawlerSessionManager {
  constructor(browser, options = {}) {
    this.browser = browser;

    this.maxPagesPerContext = options.maxPagesPerContext || 3;
    this.contexts = [];
    this.currentContextIndex = 0;
  }

  async createContext() {
    const context = await this.browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
      viewport: { width: 1280, height: 800 },
      locale: "ko-KR",
      timezoneId: "Asia/Seoul",
    });

    // stealth layer
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => false,
      });
    });

    const ctx = {
      context,
      pages: 0,
      createdAt: Date.now(),
      isAlive: true,
    };

    this.contexts.push(ctx);
    return ctx;
  }

  async getContext() {
    let ctx = this.contexts[this.currentContextIndex];

    if (!ctx || ctx.pages >= this.maxPagesPerContext || !ctx.isAlive) {
      ctx = await this.createContext();
      this.currentContextIndex = this.contexts.length - 1;
    }

    return ctx;
  }

  async getPage() {
    const ctx = await this.getContext();

    const page = await ctx.context.newPage();
    ctx.pages++;

    return {
      page,
      context: ctx,
    };
  }

  async safeGetPage() {
    try {
      return await this.getPage();
    } catch (err) {
      console.log("⚠️ context crash → recreating");

      await this.rotateContext();
      return await this.getPage();
    }
  }

  async rotateContext() {
    this.currentContextIndex++;

    if (this.currentContextIndex >= this.contexts.length) {
      this.currentContextIndex = 0;
    }

    const ctx = this.contexts[this.currentContextIndex];

    if (ctx) {
      try {
        await ctx.context.close();
      } catch {}
      ctx.isAlive = false;
    }
  }

  async close() {
    for (const ctx of this.contexts) {
      try {
        await ctx.context.close();
      } catch {}
    }

    this.contexts = [];
  }
}

module.exports = CrawlerSessionManager;
