# @mtropro/mcp

MCP (Model Context Protocol) server for MTROPRO. Lets AI assistants manage properties, bookings, guests, vendors, tasks, leads, and more through natural language.

## Setup

### Install dependencies

```bash
pnpm install
```

### Build

```bash
pnpm build
```

### Configure in Claude Code

Add this to your Claude Code MCP settings (`~/.claude/settings.json` or project `.claude/settings.json`):

```json
{
  "mcpServers": {
    "mtropro": {
      "command": "node",
      "args": ["/absolute/path/to/mcp/run.mjs"]
    }
  }
}
```

## Authentication

Two options:

1. **Environment variable** - Set `MTROPRO_API_KEY` with your API key.
2. **Browser login** - If no key is configured, the server exposes an `authenticate` tool. Call it to open a browser window where you can log in to the admin panel. The API key is saved to `.auth.json` for subsequent sessions.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `MTROPRO_API_KEY` | - | API key (skips browser auth) |
| `MTROPRO_API_URL` | `https://core.mtro.app` | Core API base URL |
| `MTROPRO_ADMIN_URL` | `https://mtropro.app` | Admin panel URL (used for browser auth) |

## Available tools

### Properties
`properties_list` `properties_get` `properties_get_by_entity` `properties_create` `properties_update` `properties_delete`

### Bookings
`bookings_list` `bookings_get` `bookings_create` `bookings_update` `bookings_delete` `bookings_check_availability` `bookings_block_dates` `bookings_invite_guests`

### Guests
`guests_search` `guests_create` `guests_update` `guests_delete`

### Vendors
`vendors_list` `vendors_get` `vendors_get_by_entity` `vendors_create` `vendors_update` `vendors_delete`

### Tasks
`tasks_list` `tasks_get` `tasks_get_by_entity` `tasks_get_by_vendor` `tasks_create` `tasks_update` `tasks_delete`

### Leads (CRM)
`leads_list` `leads_create` `leads_update` `leads_update_stage` `leads_delete`

### Pipeline stages
`pipeline_stages_list` `pipeline_stages_create` `pipeline_stages_update` `pipeline_stages_delete`

### Templates
`templates_list` `templates_get` `templates_get_by_entity`

### Notes
`notes_list` `notes_create` `notes_delete`

### Reminders
`reminders_list` `reminders_list_by_entity` `reminders_create` `reminders_update` `reminders_delete`

### Notifications
`notifications_list` `notifications_unread_count` `notifications_mark_read` `notifications_mark_all_read`

### Reports
`reports_property_summary` `reports_trends`

### Entities
`entities_list` `entities_get`

### Users
`whoami`

## Development

```bash
pnpm dev
```

Runs the server with `tsx` for live TypeScript execution.
