export default async function handler(req, res) {
  const { path } = req.query;
  const backendUrl = `https://missing-data-tool-backend.onrender.com/${path.join('/')}`;
  
  try {
    const response = await fetch(backendUrl, {
      method: req.method,
      headers: {
        ...req.headers,
        host: undefined,
      },
      body: req.method !== 'GET' ? req.body : undefined,
    });
    
    const data = await response.text();
    res.status(response.status).send(data);
  } catch (error) {
    res.status(500).json({ error: 'Proxy error' });
  }
}