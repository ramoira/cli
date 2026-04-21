ramoira/cli/
│
├── README.md
├── LICENSE                        ← MIT
├── CHANGELOG.md
├── package.json
├── tsconfig.json
├── .npmignore
│
├── src/
│   ├── index.ts                   ← entry point, registers commands
│   │
│   ├── commands/
│   │   ├── init.ts                ← ramoira init
│   │   ├── publish.ts             ← ramoira publish
│   │   ├── status.ts              ← ramoira status (shows local schema state)
│   │   └── validate.ts            ← ramoira validate (checks schema against spec)
│   │
│   ├── lib/
│   │   ├── intake.ts              ← terminal question flow
│   │   ├── generator.ts           ← builds schema from intake answers
│   │   ├── summary.ts             ← extracts summary from full schema
│   │   ├── validator.ts           ← validates schema against spec
│   │   ├── api.ts                 ← calls ramoira.com/api
│   │   ├── auth.ts                ← token storage, browser auth flow
│   │   ├── config.ts              ← reads/writes ramoira.config.json
│   │   └── files.ts               ← reads/writes local schema files
│   │
│   └── templates/
│       ├── brand.schema.json      ← blank schema template
│       ├── brand.llms.txt         ← blank llms.txt template
│       └── ramoira.config.json    ← blank config template
│
├── tests/
│   ├── init.test.ts
│   ├── publish.test.ts
│   ├── validator.test.ts
│   └── fixtures/
│       ├── valid.schema.json      ← test fixture
│       └── invalid.schema.json   ← test fixture
│
└── docs/
    ├── init.md                    ← ramoira init reference
    ├── publish.md                 ← ramoira publish reference
    ├── validate.md                ← ramoira validate reference
    └── config.md                  ← ramoira.config.json reference
