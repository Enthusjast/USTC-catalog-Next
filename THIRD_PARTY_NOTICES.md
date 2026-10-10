# Third party notices

The API schemas and adapters were independently implemented against public
responses and the USTC-catalog-CLI interface definitions. The teaching period
layouts in `src/domain/periods.ts` are transcribed from that project's
`src/domain/schedule.ts`.
The public subject code mappings in `src/domain/courseCatalog.ts` are transcribed
from its `src/data/course-catalog.ts` and checked against the official catalogue.

The factual classroom directory in `src/domain/roomDirectory.ts` was independently
transcribed from the public official catalogue configuration on 2026-10-10:
https://catalog.ustc.edu.cn/query/classroom
(bundle: https://catalog.ustc.edu.cn/assets/index-DeAsVxMB.js).
It includes the 258 enabled rooms visible for borrowing or teaching scheduling,
their room identifiers, names, building identifiers and explicitly supplied floors.
The directory was compared with the USTC-catalog-CLI room snapshot. The official
catalogue's implementation code and graphical assets are not redistributed here;
the MIT notice below applies to the referenced CLI materials, not to the official
catalogue. Room metadata is a dated factual reference, not a guarantee of access,
availability or complete usage coverage.

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
