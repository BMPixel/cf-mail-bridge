export class RequestBuilder {
  private url: string = '';
  private method: string = 'GET';
  private headers: Record<string, string> = {};
  private body?: string;

  static create(): RequestBuilder {
    return new RequestBuilder();
  }

  setUrl(url: string): RequestBuilder {
    this.url = url;
    return this;
  }

  setMethod(method: string): RequestBuilder {
    this.method = method;
    return this;
  }

  setHeader(key: string, value: string): RequestBuilder {
    this.headers[key] = value;
    return this;
  }

  setHeaders(headers: Record<string, string>): RequestBuilder {
    this.headers = { ...this.headers, ...headers };
    return this;
  }

  setAuth(token: string): RequestBuilder {
    this.headers['Authorization'] = `Bearer ${token}`;
    return this;
  }

  setJsonBody(data: any): RequestBuilder {
    this.headers['Content-Type'] = 'application/json';
    this.body = JSON.stringify(data);
    return this;
  }

  setFormBody(data: Record<string, string>): RequestBuilder {
    this.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    this.body = new URLSearchParams(data).toString();
    return this;
  }

  build(): Request {
    const init: RequestInit = {
      method: this.method,
      headers: this.headers,
    };

    if (this.body) {
      init.body = this.body;
    }

    return new Request(this.url, init);
  }

  // Convenience methods for common request types
  static get(url: string): RequestBuilder {
    return RequestBuilder.create().setUrl(url).setMethod('GET');
  }

  static post(url: string): RequestBuilder {
    return RequestBuilder.create().setUrl(url).setMethod('POST');
  }

  static put(url: string): RequestBuilder {
    return RequestBuilder.create().setUrl(url).setMethod('PUT');
  }

  static delete(url: string): RequestBuilder {
    return RequestBuilder.create().setUrl(url).setMethod('DELETE');
  }
}