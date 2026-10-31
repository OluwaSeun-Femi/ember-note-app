# SPEC: Markdown Notes

The same for every group. Groups change only the Driver column.

## Client brief

"My notes are all over the place: WhatsApp, paper, my phone. I want one page where I write a note, using Markdown for headings, bold and lists, and give it tags like 'work' or 'church'. Later I want to find it again by searching or by clicking a tag. My notes must still be there when I come back tomorrow on the same phone or laptop. It must work on my phone. Send me the link."

**Built:** Sunday 25 October, 6pm–8pm, in your group repo.
**Delivered:** a public link, tested live by the client at 7:25.

## Done means (the client's acceptance criteria)

- [ ] 1. I can write a note with a title, a Markdown body and tags, and save it.
- [ ] 2. A note without a title or body is not saved, and I'm told why.
- [ ] 3. Headings, bold, lists and links show formatted, not as # and **.
- [ ] 4. After I refresh the page, my notes are still there.
- [ ] 5. Clicking a tag shows only notes with that tag; "All" shows every note again.
- [ ] 6. Search finds notes by words in the title or the body, and says "No notes match" when nothing is found.
- [ ] 7. I can delete a note, and it stays deleted after a refresh.
- [ ] 8. It works on my phone, from a public link.

## What the client told us

| Question | Answer |
|---|---|
| Do I need to log in? | No, not yet. |
| Must notes sync between phone and laptop? | Not this week. The same browser is fine. |
| Can I delete a note? | Yes. Editing would be nice but isn't required. |
| How many tags per note? | As many as I like, separated by commas. |
| Search title only, or the note too? | Both. |
| What Markdown do you need? | Headings, bold, lists and links. |

## How we'll build it

- Next.js app in a folder called `notes` in the group repo, styled with Tailwind.
- A server action `checkNote` in `app/actions.ts` checks every note before it's kept: it rejects an empty title or body, and cleans the tags (trims spaces, lowercase, no duplicates, so `Work, work` becomes `work`).
- Notes are saved in the browser with localStorage, read inside `useEffect`. (A database comes in week 3.)
- Markdown is shown with `react-markdown`.

## Features to build (in this order)

| # | Feature | Done when | Driver |
|---|---|---|---|
| 1 | Write and save a note | Title, body and tags save; an empty title shows a message | |
| 2 | Still there after a refresh | Refresh, and the notes are still there | |
| 3 | Markdown display | # heading, **bold** and - list show formatted | |
| 4 | Tags | Clicking a tag filters; "All" clears it | |
| 5 | Search | Finds title or body words; says when nothing matches | |
| 6 | Delete | Deleted notes stay deleted after a refresh | |
| 7 | Phone | Looks right on a phone screen | |

Fill in the Driver column on Saturday. Drivers swap at 7:05 on Sunday. The captain reviews and merges every pull request. At 7:15, stop adding features and deploy with `npx vercel --prod`.

## The client test (Sunday, 7:25, on the live link)

1. Save a note with no title. (A message, not a saved note.)
2. Save "Shopping" with body `# This week` and `- **rice**`, tags `home, Food`.
3. Refresh. (Still there; tags show home and food.)
4. Search a word that is only in the body.
5. Search zzz. ("No notes match".)
6. Click a tag, then "All".
7. Delete the note, then refresh.
8. Open the link on a phone.

## Not in scope this week

Logging in, syncing between devices, editing a note.
