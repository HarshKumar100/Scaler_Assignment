export interface Question {
  id: number;
  title: string;
  description: string;
  type: string;
  required: boolean;
  position: number;
  settings: { options?: string[]; max_rating?: number };
}

export interface Form {
  id: number;
  title: string;
  slug: string;
  status: string;
  thank_you_message: string;
  theme: {
    primary_color: string;
    background_color: string;
    text_color: string;
    font_family: string;
  };
  questions: Question[];
  response_count: number;
  created_at: string;
  updated_at: string;
}

export interface FormResponse {
  id: number;
  submitted_at: string;
  completed: boolean;
  answers: Record<string, string>;
}

export interface QuestionStat {
  question_id: number;
  title: string;
  type: string;
  count: number;
  counts?: Record<string, number>;
  average?: number;
}

export interface FormStats {
  total_responses: number;
  completion_rate: number;
  questions: QuestionStat[];
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'API request failed';
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        errorDetail = typeof errorData.detail === 'string' 
          ? errorData.detail 
          : JSON.stringify(errorData.detail);
      }
    } catch (e) {
      // Ignore JSON parse error for error responses
    }
    throw new Error(errorDetail);
  }

  if (response.status === 204) {
    return undefined as any;
  }

  if (response.headers.get('content-type')?.includes('text/csv')) {
    return (await response.text()) as any;
  }

  return response.json();
}
