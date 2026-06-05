window.DachaGoConfig = {
    apiUrl: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
        ? 'http://localhost:5005/api/v1' 
        : 'https://dev-net-rent.onrender.com/api/v1',
    colors: {
        primary: '#2599C8',
        background: '#F7F9FC',
        text: '#1A1D1E'
    }
};
