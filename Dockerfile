# DinoQuiz is a build-step-free static PWA (see CONVENTIONS.md): the whole
# web root already lives under public/, so this image just serves it with
# nginx — no compile/bundle stage needed.
FROM nginx:1.27-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY public/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
