// Use relative URLs for production, localhost for development
const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : '';

export type Pathway = Record<string, any>;

export interface PathwaysParams {
  diseaseId: string;
  library: string;
  fdr_lt?: number;
  hide_leading_edge?: boolean;
}

export interface GseaParams {
  tsv_file: File;
  gmt_name: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: 'success' | 'error';
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, {
        ...defaultOptions,
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        data,
        status: 'success',
      };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        data: null as T,
        message: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
      };
    }
  }

  // GSEA endpoint
  async runGsea(params: GseaParams): Promise<ApiResponse<Pathway[]>> {
    const formData = new FormData();
    formData.append('tsv_file', params.tsv_file);

    return this.request<Pathway[]>(`/api/gsea?gmt_name=${encodeURIComponent(params.gmt_name)}`, {
      method: 'POST',
      body: formData,
      headers: {}, // Let the browser set the Content-Type for FormData
    });
  }

  // Get available GMT libraries
  async getGmtLibraries(): Promise<ApiResponse<string[]>> {
    return this.request<string[]>('/api/gsea/libraries');
  }

  // Pathways endpoint matching the FastAPI service
  async getPathways(params: PathwaysParams): Promise<ApiResponse<Pathway[]>> {
    const searchParams = new URLSearchParams({
      diseaseId: params.diseaseId,
      library: params.library,
    });

    if (params.fdr_lt !== undefined) {
      searchParams.append('fdr_lt', params.fdr_lt.toString());
    }

    if (params.hide_leading_edge !== undefined) {
      searchParams.append('hide_leading_edge', params.hide_leading_edge.toString());
    }

    return this.request<Pathway[]>(`/pathways/?${searchParams.toString()}`);
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string }>> {
    return this.request<{ status: string }>('/health');
  }
}

export const apiClient = new ApiClient();
export default apiClient; 