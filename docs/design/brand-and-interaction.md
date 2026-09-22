# Record Review: brand and interaction specification

Status: Approved visual direction.

Version: 0.1

Date: September 22, 2026

Scope: Product identity, interface measurements, interaction behavior, and static design references. The project owner approved version 0.1 on September 22, 2026. Application implementation follows a separate approval after engineering foundation work.

## 1. Identity

Use **Record Review** as the working product name and **Social Security appeals** as the descriptor. The name emphasizes the task and leaves judicial decisions with the reviewer. Court collaborators can approve a different public name before deployment.

Use a simple outlined page mark alongside the wordmark. The mark contains a second page edge and a short source line. Avoid courthouse illustrations, seals, gavels, mascots, or symbols that imply an official judicial endorsement. Use the mark in the application header and a simplified single-page version at small sizes.

The interface should feel orderly, readable, and composed. Use warm neutral backgrounds, dark navy text, a restrained teal action color, and clear source links. Give text and documents more space than decorative elements. Preserve the same color treatment for the plaintiff and commissioner; party colors must not imply a preferred position.

Use direct product language: “Open source,” “Review item,” “Correct entry,” “View history,” and “Could not locate.” Explain consequences in the same place as the action. Reserve technical terms such as extraction version and model profile for provenance or operator details.

All examples in the static references use fictional records. The example passages illustrate layout and interaction; the examples do not establish medical findings or legal positions for a real case.

## 2. Visual references

| Reference                                                       | Purpose                                                                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [Brand board](brand-board.svg)                                  | Identity, palette, typography, buttons, and evidence states.                                           |
| [Medical chronology: desktop](medical-chronology-desktop.svg)   | Search and filter controls, selectable rows, source viewer, and field evidence.                        |
| [Arguments and evidence: desktop](review-workspace-desktop.svg) | RFC comparison, party attribution, separate statement/evidence links, and a contextual source passage. |
| [Upload and processing: desktop](upload-desktop.svg)            | Durable-upload confirmation, document stages, progress, and recoverable review items.                  |
| [Case and source: mobile](review-workspace-mobile.svg)          | Stacked chronology entries and the full-screen source view.                                            |

These SVG references contain no application logic, live case data, or network connections. The SVG references show intended appearance. The implementation phase will supply keyboard behavior, resizing, filtering, navigation, and accessible semantics.

## 3. Color system

| Token              | Value     | Use                                                        |
| ------------------ | --------- | ---------------------------------------------------------- |
| Canvas             | `#F6F5F1` | Page background and quiet surrounding space.               |
| Surface            | `#FFFFFF` | Tables, source panels, dialogs, and document backgrounds.  |
| Text               | `#183247` | Headings, primary text, and the wordmark.                  |
| Secondary text     | `#52636F` | Metadata and supporting copy.                              |
| Action             | `#176864` | Primary actions, selected navigation, and selection edges. |
| Action hover       | `#10514F` | Hover/pressed primary controls.                            |
| Action tint        | `#E8F2EF` | Selected rows and neutral “Passage located” labels.        |
| Citation           | `#245C89` | Underlined source links and the keyboard focus ring.       |
| Citation tint      | `#E9F1F7` | Source controls and source-type labels.                    |
| Review             | `#80590D` | Review-item text and icons.                                |
| Review tint        | `#FFF2D8` | Review-item backgrounds.                                   |
| Error              | `#A3313A` | Failed actions and invalid fields.                         |
| Error tint         | `#FBEDEE` | Error backgrounds.                                         |
| Document highlight | `#FFF0B6` | Selected source passage behind the original text.          |
| Divider            | `#D8DEDE` | Decorative row and panel separation.                       |
| Control boundary   | `#7C8B94` | Input and secondary-button boundaries.                     |
| Muted surface      | `#EDF0F1` | Neutral badges and disabled controls.                      |

Measured contrast ratios for the specified foreground/background pairs: primary text on white 13.24:1; secondary text on white 6.23:1; white on the action color 6.56:1; citation text on citation tint 6.20:1; review text on review tint 5.65:1; error text on error tint 6.03:1; located text on action tint 5.74:1; control boundary on white 3.51:1. Highlighted primary text retains 11.60:1 contrast.

These measurements apply to the listed pairs. A translucent overlay, another text color, or another background requires another contrast check. Decorative dividers do not replace visible control boundaries. Color never supplies the only status or group cue.

For procedural-stage groups, pair a text label with a small colored edge: Initial claim, Reconsideration, ALJ hearing, Appeals Council, and District court. Keep group colors visually distinct from failure and review status. A star-shaped outline plus “Milestone” identifies important dates. Users can change group assignment and milestone emphasis independently.

## 4. Typography and content density

Use `Arial, Helvetica, sans-serif` for application text. This system-font approach avoids remote font requests and supplies familiar, compact letterforms on common court workstations. Qualify the deployed fallback on the court's operating system. Use `Georgia, "Times New Roman", serif` for the wordmark and optional excerpt presentation. The source viewer preserves document typography when rendering original pages.

| Role                     | Size / line height | Weight and constraints                                                      |
| ------------------------ | ------------------ | --------------------------------------------------------------------------- |
| Product wordmark         | 26 / 32 px         | Bold serif; use 22 / 28 px on narrow screens.                               |
| Page heading             | 28 / 36 px         | 700; 24 / 32 px on mobile.                                                  |
| Section heading          | 20 / 28 px         | 700.                                                                        |
| Card heading             | 16 / 24 px         | 700.                                                                        |
| Body and table cells     | 16 / 24 px         | 400; preserve full clinical text in expanded details.                       |
| Quoted passage           | 18 / 28 px         | Regular serif; preserve punctuation and source wording.                     |
| Metadata and field label | 14 / 20 px         | 400 or 700; do not hide essential information in lighter text.              |
| Button text              | 16 / 20 px         | 700.                                                                        |
| Small utility label      | 12 / 16 px         | Limited to nonessential visual grouping; avoid paragraph text at this size. |

Limit long prose to roughly 65–75 characters per line. Use 12 px between adjacent paragraphs, 24 px between related sections, and 32 px between major groups. Use tabular numerals for dates, page counts, progress counts, and durations. Show dates as “Jul 18, 2022” and preserve incomplete dates explicitly.

Default tables use a 56 px minimum row height and expand when text wraps. Provide a comfortable density with 12 px vertical cell padding. A compact desktop preference may use 8 px padding; retain 44 px minimum hit areas for interactive row controls. On mobile, use cards with visible field labels and full-width source actions.

Never use an ellipsis as the only way to present a medically significant field. Expand long medication instructions, dates, qualifiers, and quoted passages. Use a disclosure for extensive source context and preserve a clear way to read the full text.

## 5. Layout and components

Use a 4 px spacing unit with a preferred scale of 4, 8, 12, 16, 24, 32, and 48 px. Use 8 px corner radii for buttons, fields, and cards, and 12 px for dialogs. Keep panel shadows subtle; use borders to distinguish most surfaces.

| Component                | Measurements and behavior                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Global header            | 72 px desktop, 64 px mobile; product left, case navigation and account controls right.                          |
| Page padding             | 32 px desktop, 24 px tablet, 16 px mobile.                                                                      |
| Primary/secondary button | Minimum 44 px high; 16 px horizontal padding; 8 px radius; 8 px icon/text gap. Allow full-width mobile buttons. |
| Icon-only button         | Minimum 44 × 44 px; visible focus and accessible name; tooltip supplements the name.                            |
| Input/select             | Minimum 44 px high; 12 px internal horizontal padding; persistent label outside the field.                      |
| Navigation tab           | Minimum 48 px high; 16 px horizontal padding; selected underline and text change.                               |
| Status badge             | 14 / 20 px text, 4 × 8 px padding, icon plus explicit label; noninteractive by default.                         |
| Source button            | Minimum 44 px hit height; underlined blue source label; show page/exhibit context where space allows.           |
| Panel header             | Minimum 64 px; title, document context, and close or maximize control.                                          |
| Source toolbar           | Minimum 48 px; physical-page selection, zoom, and previous/next passage.                                        |
| Table header             | Minimum 48 px; clear sort direction and a keyboard-operable sort button.                                        |
| Dialog                   | 560 px preferred width, maximum viewport minus 32 px; scroll long content inside a clearly bounded body.        |
| Focus indicator          | 3 px citation-color outline, 2 px offset; maintain visibility against adjacent surfaces.                        |

Use these layout ranges as implementation guidance:

- At 1,200 px and wider, support a resizable artifact/source split. Start around 55% artifact and 45% source. Keep the artifact at least 520 px wide and the source panel at least 440 px wide; switch modes when the available width cannot satisfy both minimums.
- At 768–1,199 px, use one artifact column and a full-width source overlay. Retain the case context and return target.
- Below 768 px, use stacked content and a full-screen source route. Preserve case navigation, selected passage, and scroll position when returning.

Use a wide layout for case work rather than a narrow marketing-page container. Let the source pane maximize for close reading. Constrain ordinary prose independently from the overall workspace width.

## 6. Screen behavior

### 6.1 Home and saved cases

Lead the home page with “Your case workspace.” Place “Upload case record” beside “Open existing case,” followed by recent authorized cases. List each case's label, last activity, document/page counts, and explicit readiness state. Use “No cases yet” with the upload action when the workspace is empty.

The case list supports case-label search and readiness filtering. Keep actions inside a case row limited to opening the case and an accessible action menu. Never reveal a case through a search result before authorization succeeds.

### 6.2 Upload and processing

Use an accessible file chooser and a drag-and-drop target. Show supported file formats and configured size limits beside the chooser. Provide a manifest with filename, size, detected content role, and a remove action before transfer. Explain optional briefs in the completeness checklist.

Before upload, the primary action reads “Upload and process.” During transfer, show acknowledged bytes and “Keep this tab open until upload finishes.” After the server confirms durable storage, replace that message with “Upload complete. You can close this tab while processing continues.”

Display labeled stages: Inspect files, Read documents, Map sources, Extract entries, Check citations, and Prepare workspace. Show completed document/page counts separately from the overall stage. Use “Processing · 9 of 14 documents” rather than a fabricated precision percentage when total work remains uncertain.

Each document row can show Queued, Reading, Checking citations, Ready, Needs review, or Failed. A review item offers “Review details”; a recoverable failure offers “Retry document.” Show partial results without implying that every document succeeded. A cancel action explains which completed uploads remain available.

### 6.3 Shared case header and navigation

Keep the case label, safe case identifier, source count, and readiness state above four links: Summary, Medical chronology, Procedural chronology, and Five-step review. The last link includes RFC within the content rather than in an excessively long tab label.

Use the same case header on all four routes. Show the selected route with `aria-current="page"`; implement the navigation as links rather than a tab widget with mismatched keyboard behavior. On mobile, use a labeled “Case section” selector or equivalent compact navigation that exposes all four routes.

### 6.4 Summary

Group content under Claim background, ALJ decision, Plaintiff's arguments, Commissioner's arguments, and Replies. Show source controls immediately after each substantive excerpt or sentence. Keep party labels visible and give both parties equivalent visual treatment.

Distinguish “No reply supplied” from “Reply processing incomplete.” A case-level coverage notice remains visible when processing gaps could affect the summary. Avoid a hero conclusion that suggests an outcome.

### 6.5 Medical chronology

Place a labeled search field above the table, followed by provider, date, and review-status filters. Provide “Group by” separately from filters and show the current result count. On narrower screens, collapse optional filters behind a “Filters” button with an active-filter count.

Use Date, Provider, Reason for visit, Prescription, and Source columns. Show the prescription action or uncertainty explicitly. Selecting a source opens the right-hand viewer on desktop and the source route on mobile. The selected row receives a teal edge and a pale background; the source passage receives a yellow highlight.

Row expansion reveals field-specific source references, extraction/review status, and “Correct entry” and “View history.” Keep the ordinary source link visible without row expansion. A review badge identifies a check to perform, not a negative finding about the claimant.

### 6.6 Procedural chronology

Use Date, Event, Stage, and Source columns. Display a semibold date and a labeled milestone marker for configured important events. Add stage labels to any colored grouping. Preserve chronological order within each group and show unknown dates explicitly.

Offer separate controls for “Correct event,” “Change group,” and “Mark as milestone.” Group and emphasis changes should not trigger a claim that a source fact changed. A grouped view always offers a return to an ungrouped chronology.

### 6.7 Five-step review and RFC

Use a step selector ordered 1, 2, 3, RFC, 4, 5, followed by “Other brief issues.” Beneath the selector, show a brief-backed issue title and its related party positions. Display ALJ decision, Plaintiff, and Commissioner with equal-size labels and neutral backgrounds.

With the source pane closed and sufficient width, use three comparison columns. With the source pane open, stack position cards to preserve readable quote widths. On mobile, stack all positions. Label reply passages and transcript speakers explicitly.

Each card offers “View statement” for the originating brief/decision passage and a separate “View cited evidence” action when the passage contains a record citation. A source-pane switch distinguishes Statement from Cited evidence. Show the literal citation even when resolution fails.

An unresolved source shows “The application could not locate this citation in the indexed record,” followed by the indexed scope and a source-search action. A comparison alert supplies passages and context without characterizing a party's conduct or recommending a result.

### 6.8 Source viewer

Show filename, physical page or native locator, and transcript/exhibit label as separate fields. Examples: “12-7.pdf · PDF page 19 of 84,” with “Tr. 432 · Ex. 8F/12” underneath. Mark an extracted Office view as an extracted view; never label a paragraph index as an original page.

Keep context around a highlighted passage. Add an outlined selection edge or annotation marker so the yellow fill does not provide the only cue. Offer previous/next passage, page navigation, zoom, original download, and maximize controls when permissions permit.

Use precise statuses: Passage located, OCR text—review scan, Page located—passage needs review, Multiple possible locations, Could not locate, and Source processing incomplete. Reserve “Reviewed by [name]” for an actual human assessment of the displayed revision.

The source header can expose a collapsed “Originating statement” on mobile. Closing the source view returns focus to the source control that opened the passage and restores the prior scroll position. A saved source URL must recover the same authorized document version and passage.

### 6.9 Corrections, definitions, and history

The correction dialog shows the current value, the proposed value, supporting source, and a reason field. Keep the source within reach while editing. Use “Save correction” as the primary action and “Cancel” as the secondary action. Show a saved-revision confirmation without obscuring the evidence.

A stale-edit conflict displays both values and requires a deliberate resolution. Correction history identifies author, time, reason, previous value, and source change. Restoring an earlier value creates another revision.

Term lookup opens a reference panel or mobile sheet with the term, definition, publisher, and reference date. Add “General reference” above the definition. Use “No approved definition found” when no curated match exists. Do not replace case text with a definition.

## 7. Component states and accessibility

Document default, hover, active, focus, disabled, loading, empty, validation-error, and success states during implementation. A loading button keeps a readable action label and prevents duplicate submissions. A disabled action includes a nearby reason when the restriction might confuse the user.

Use semantic headings, links, buttons, tables, labels, and form errors. Announce processing updates at a restrained interval; a screen reader should not announce every token or page callback. Respect reduced motion, maintain focus through dialogs, and support keyboard source navigation. Avoid drag-only controls; a resizable splitter needs keyboard equivalents.

Target WCAG 2.2 AA. The 44 px component target is a product choice; the design does not claim that every WCAG AA target-size requirement equals 44 px. Manual keyboard and screen-reader checks supplement automated analysis. [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

Check desktop widths of 1,440 and 1,280 px, tablet width of 1,024 px, and mobile widths of 390 and 320 px. Test 200% text scaling, high browser zoom, long names, long medication instructions, missing values, and localization-length stress. The static references do not constitute a passing accessibility or responsive implementation test.

## 8. Approval boundary

Approval of this specification accepts the working identity, palette, typography, component dimensions, responsive layout direction, and interaction behavior. The next phase establishes engineering tooling and enforcement. No application code, package installation, repository commits, or PRs form part of this visual-design deliverable.
