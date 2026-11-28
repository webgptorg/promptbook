# 🌎 Remote server

This is the remote server that will be used to host the application.

You can run it via ``pm2` or `docker` but we recommend using some reverse proxy like `nginx` or `caddy` to handle the SSL certificates and the load balancing.

The server has two modes:

-   **Application mode** is situation when you run known and well-defined books with your own api keys
-   **Anonymous mode** is when you run arbitrary user books without api keys from user
    Note: This is useful in situations when the LLM provider does not allow to call the API requests from the client side (It is kind of a proxy mode)
