# Menashe Hoffner — Portfolio

A responsive, buildless portfolio with a custom WebGL sculpture, filterable project gallery, and individual project pages. Built with HTML, CSS, and vanilla JavaScript. Compatible with GitHub Pages, including deployment under `/portfolio-web/`.

The visual theme uses warm ivory, mint, and sky blue with dark readable text. Sage, Ice, and Ember retain accessible text accents while tinting the sculpture separately. The game uses a pastel nebula, a blue ringed planet, and light translucent controls; its background is still cached once per resize.

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

## Orbital Archive game

`game.html` is a playable space exploration portfolio. The homepage introduces Menashe and links directly to the gallery. Two inviting game cards are visible in the opening section, with larger previews in the playground; both games are optional. The gallery, résumé, and contact remain directly accessible.

- Fly with physical WASD keys or arrow keys. Hold Space to boost, P or Escape to pause. A mouse drag or the mobile direction pad also steers the ship.
- Follow the diamonds, avoid asteroids, and align with the three project portals. Recovering a portal awards 250 points and opens that real project’s description, demo, and case study. Each data fragment awards 25 points.
- Navigation assist automatically aligns the ship and avoids collision damage. It is available from the briefing and during a flight. Manual steering takes back control.
- A depleted shield offers a retry without losing discoveries. A missed portal returns on the next orbit. Completing the route opens the full archive and contact link.
- Progress is stored locally under `portfolio.orbital-save.v1`; malformed/unavailable storage falls back safely. Restart expedition or Fly again resets only game progress.
- The simulation pauses when the page loses focus or becomes hidden. Reduced motion removes decorative bobbing, animated planet modules, and boost streaks; explicitly started flight remains playable.
- Artwork uses a cached procedural background and lightweight Canvas 2D perspective projection of world coordinates. No game library, 3D asset download, backend, or build step is required.
- `flight-engine.js` contains deterministic simulation rules. `game.js` handles rendering and accessible DOM controls. `game.css` is scoped to the game page.

Run the simulation checks with:

```sh
node --test tests/flight-engine.test.cjs
```

## Sunday Drive

`drive.html` is a sunny, optional road trip with a small coral car, a winding cream road, trees, cottages, collectible stars, and three project stops. Steer with Left/Right or A/D, hold Space to accelerate, and use P/Escape or the pause button to pull over. Mobile has held steering and boost controls. Cones briefly slow the car; there is no game-over gate. Every project stop links directly to its case study, and completion shows all projects together.

Rendering is dependency-free Canvas 2D with capped pixel density. It runs only during a started drive and pauses on blur or a hidden tab. `drive-engine.js` separates deterministic movement, stops, collectibles, and collisions from presentation. Run both game suites with `node --test tests/*.test.cjs`.

## Publish on GitHub Pages

Publish the repository root from the branch selected in the repository’s **Settings → Pages**. No bundler, backend, API keys, or package installation is needed. Check the changes in a branch or pull request before updating the existing published branch.
