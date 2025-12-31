class ApiError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
    
    // This is needed for TypeScript when extending built-in classes
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export const fetcher = async (url: string) => {
  const res = await fetch(url);
  
  if (!res.ok) {
    const error = new ApiError('An error occurred while fetching the data.', res.status);
    throw error;
  }
  
  return res.json();
};

export default fetcher;
