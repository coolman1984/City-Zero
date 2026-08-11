# City Zero Core Design QA

- Source visual truth: `public/city-day.jpg`
- Browser comparison surface: `http://terminal.local:4173/design-qa-comparison.html`
- Implementation route: `http://terminal.local:4173/core`
- Source pixels: 864 × 1536, normalized in-browser to 393 × 852 CSS pixels.
- Implementation pixels: 393 × 852 CSS pixels at device pixel ratio 1 inside the cloud-browser comparison frame.
- Comparison state: day mode, Future Industries selected, mobile layout.
- Full-view evidence: source and implementation were rendered together in the same 1363 × 936 cloud-browser capture.
- Focused evidence: top resource HUD, city/world layer, selected-building card, camera rail, and bottom navigation were readable in the same comparison capture; separate crops were not required.

## Findings

No actionable P0, P1, or P2 issues remain for this vertical-slice scope.

- Fonts and typography: compact hierarchy is consistent and readable at the target mobile viewport. Icons come from one production icon family instead of emoji or text symbols.
- Spacing and layout rhythm: persistent controls stay within the viewport, do not overlap each other, and preserve the city as the dominant surface.
- Colors and visual tokens: the teal, deep-navy, lime, amber, and glass palette remains consistent with the source direction. Day brightness and edge vignetting were corrected in the second comparison.
- Image quality and asset fidelity: the implementation uses the supplied high-resolution city art as the visual plate. It is neither stretched nor replaced with code-drawn buildings. Live effects remain additive and secondary.
- Copy and content: labels, values, building state, output, level, and camera action are concise and internally consistent.
- Responsive behavior: the app was rendered inside a true 393 × 852 iframe viewport, not scaled from a desktop capture.
- Interaction: next asset, day/night, zoom, center, focus, and canvas rendering were tested.
- Console: no application errors or warnings remained in the final run. A browser-extension metadata message was excluded because it is outside the application.

## Comparison history

1. Initial browser run: Phaser was forced to WebGL and the verification browser exposed no WebGL context. Fixed by using Phaser AUTO, which keeps WebGL as the preferred production renderer and provides a Canvas fallback.
2. First visual comparison: the selected power facility was outside the initial desktop crop. Fixed by selecting the central industrial asset by default.
3. First mobile comparison: day grading was too dark and some small HUD copy was undersized. Fixed by reducing the day vignette and increasing mobile text sizes.
4. Final comparison: source and implementation were captured together at matching 393 × 852 viewports. No P0, P1, or P2 differences remained for the approved high-fidelity direction.

## Follow-up polish

- P3: create separate genuine night art and building emissive masks instead of relying only on scene grading.
- P3: replace the temporary single city plate with layered district assets before expanding gameplay.

final result: passed
