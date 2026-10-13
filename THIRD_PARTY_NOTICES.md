# Third party notices

## Varlet

Varlet UI, its shared/composable packages and bundled icon font are used for the
Material Design 3 interface. Project: https://github.com/varletjs/varlet.

The MIT License (MIT)

Copyright (c) 2024 varletjs

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Catalogue reference materials

The API schemas and adapters were independently implemented against public
responses and the USTC-catalog-CLI interface definitions. The teaching period
layouts in `src/domain/periods.ts` are transcribed from that project's
`src/domain/schedule.ts`.
The public subject code mappings in `src/domain/courseCatalog.ts` are transcribed
from its `src/data/course-catalog.ts` and checked against the official catalogue.

The initial factual classroom directory in `src/domain/roomDirectory.ts` was independently
transcribed from the public official catalogue configuration on 2026-10-10:
https://catalog.ustc.edu.cn/query/classroom
(bundle: https://catalog.ustc.edu.cn/assets/index-DeAsVxMB.js).
That initial snapshot includes the 258 enabled rooms visible for borrowing or teaching scheduling,
their room identifiers, names, building identifiers and explicitly supplied floors.
The directory was compared with the USTC-catalog-CLI room snapshot. The official
catalogue's implementation code and graphical assets are not redistributed here;
the MIT notice below applies to the referenced CLI materials, not to the official
catalogue. Room metadata is a dated factual reference, not a guarantee of access,
availability or complete usage coverage.
Subsequent directory checks record their URL, bundle and verification date in
`roomDirectorySource`. The synchronization tool reads factual literal records
without executing or redistributing the official application code.

The third teaching building's presentation groups were checked against the same
official page and bundle on 2026-10-11: rooms prefixed 3A or 3B belong to Section
A & B, and rooms prefixed 3C belong to Section C. These display groups retain
the original API building identifier 3 and the directory's explicit floors.

Source: https://github.com/Enthusjast/USTC-catalog-CLI

MIT License

Copyright (c) 2026 Enthusjast

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Icourse page index

The factual page index in `src/data/icourseLinks.ts` is derived from
`icourse_spider/course_rating.json` in RaymondzyLei/class-arrange:
https://github.com/RaymondzyLei/class-arrange
(initial source commit `4de5d04`, 2026-07-04; imported 2026-10-11).
The source records originate from https://www.icourse.club/.
Only course names, complete teacher names and page identifiers are retained.
The generated file records the source SHA-256 and import date, not a live
community update time. Ratings, reviews, the crawler and reference application
code are not included. Matching and generation code were independently written.

The reference project's original-material license states:

Copyright (c) 2026 RaymondzyLei and contributors.

- A free, non-exclusive, non-transferable license to use, copy and modify
  the material for personal, non-commercial USTC course-planning and academic
  purposes only.
- Commercial use requires prior written permission from the copyright holder.
- All rights not explicitly granted are reserved by the copyright holder.

These source terms are retained for the derived index; the project's MIT
license does not relicense that source material. The reference project's
AGPL-3.0 crawler is not redistributed or executed by this application.

## Offline application libraries

The application bundles the vite-plugin-pwa registration helper and Workbox
service worker libraries. Their MIT permission notices are retained below.

### vite-plugin-pwa

MIT License

Copyright (c) 2020-PRESENT Anthony Fu <https://github.com/antfu>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

### Workbox

Copyright 2018 Google LLC

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
