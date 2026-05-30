import axios, { AxiosInstance, AxiosError } from "axios";

export class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string, apiKey: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 30000,
    });
  }

  async get<T = any>(path: string, params?: Record<string, any>): Promise<T> {
    try {
      const response = await this.client.get(path, { params });
      return this.handleResponse(response.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async post<T = any>(path: string, body?: Record<string, any>): Promise<T> {
    try {
      const response = await this.client.post(path, body || {});
      return this.handleResponse(response.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async patch<T = any>(path: string, body?: Record<string, any>): Promise<T> {
    try {
      const response = await this.client.patch(path, body || {});
      return this.handleResponse(response.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async delete<T = any>(path: string, body?: Record<string, any>): Promise<T> {
    try {
      const response = await this.client.delete(path, { data: body || {} });
      return this.handleResponse(response.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleResponse(data: any): any {
    if (data && data.error === true) {
      throw new Error(data.message || "API request failed");
    }
    return data;
  }

  private handleError(error: unknown): Error {
    if (error instanceof Error && !(error instanceof AxiosError)) {
      return error;
    }

    const axiosError = error as AxiosError<{ message?: string; error?: boolean }>;

    if (!axiosError.response) {
      return new Error(
        "Cannot reach MTROPRO API. Is the core server running?"
      );
    }

    if (axiosError.response.status === 401) {
      return new Error(
        "Authentication failed. Check your MTROPRO_API_KEY or re-authenticate."
      );
    }

    const data = axiosError.response.data;
    if (data?.message) {
      return new Error(data.message);
    }

    return new Error(`API request failed with status ${axiosError.response.status}`);
  }
}
