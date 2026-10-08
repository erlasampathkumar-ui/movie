# Production Dockerfile for CineRed Movie App on AWS ECS / App Runner / EC2
FROM nginx:alpine

LABEL maintainer="CineRed Team"
LABEL description="CineRed Movie Ticket Booking Web Application"

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy app code
COPY index.html /usr/share/nginx/html/
COPY css /usr/share/nginx/html/css
COPY js /usr/share/nginx/html/js
COPY assets /usr/share/nginx/html/assets

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
