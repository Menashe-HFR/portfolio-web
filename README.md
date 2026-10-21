# Menashe Hoffner — Portfolio

A responsive, buildless portfolio with a custom WebGL sculpture, filterable project gallery, and individual project pages. Built with HTML, CSS, and vanilla JavaScript. Compatible with GitHub Pages, including deployment under `/portfolio-web/`.

## Preview locally

From this directory, run:

```sh
python -m http.server 4173 --bind 127.0.0.1
```

Open <http://127.0.0.1:4173>. There is no install or build step. `index.html` also opens directly, although copying the email address requires a secure browser context such as localhost or HTTPS.

## Update projects

The gallery and project pages use the entries in `projects.js`. Each entry includes its category (`web`, `automation`, or `vision`), title, summary, tags, preview artwork, source repository, and video details. Edit those entries to update the existing projects.

To add a project:

1. Add an entry with a unique `id` to `projects.js`.
2. Duplicate one of the `post-*.html` files. Update its title, description, fallback content, and `data-project` attribute to match the new entry.
3. Set the entry’s `page` to that new filename and add its assets to `images/`.
4. Add a filter button in `index.html` if introducing a new category. Project counts update automatically.

Project content is local, trusted HTML; do not populate it from untrusted user input.

## Performance and accessibility

- Dependency-free WebGL artwork: approximately 4,825 vertices, capped pixel density, and at most 30 frames per second.
- Rendering stops when the artwork leaves the viewport, the tab is hidden, or motion is paused.
- Respects `prefers-reduced-motion`; a CSS sculpture remains available when WebGL cannot start or loses its context.
- Videos load only when requested. Project images below the fold use lazy loading.
- Mobile navigation, keyboard focus indicators, skip links, and accessible project filters.
- Real `mailto:` contact and clipboard action; no nonfunctional contact form.
- Existing résumé, project recordings, and original project URLs are preserved.
- Google Fonts are optional; local system fallback fonts work without network access.

## Interactive experience

- Drag the sculpture horizontally or focus it and use the arrow keys. Home resets its orientation. Vertical touch gestures still scroll the page.
- Switch between shaded alloy and a wireframe mesh. Choose Sage, Ice, or Ember to change the artwork and site accent; this preference is stored locally when storage is available.
- Open any “Watch demo” button for a native modal video viewer. Previous/next buttons and arrow keys browse projects; Escape closes the viewer and restores focus. Video shortcuts keep working when the video has focus. Closing releases the video resource.
- Fine-pointer devices get a gentle card tilt and spotlight. Touch devices keep ordinary tap behavior.
- One-time entrance transitions and a reading progress line add depth without scroll interception. Reduced-motion preferences disable entrances and pointer tilt.
- `experience.css` and `experience.js` contain the optional homepage interaction layer. No installation or build step is needed.

## Publish on GitHub Pages

Publish the repository root from the branch selected in the repository’s **Settings → Pages**. No bundler, backend, API keys, or package installation is needed. Check the changes in a branch or pull request before updating the existing published branch.
