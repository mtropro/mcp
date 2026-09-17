# @mtropro/mcp

MCP (Model Context Protocol) server for MTROPRO. Lets AI assistants manage properties, bookings, guests, vendors, tasks, leads, and more through natural language.

The server calls MTRO Core with:

```http
Authorization: Bearer <MTROPRO_API_KEY>
```

## Install

```bash
npx -y @mtropro/mcp
```

Requires Node.js 20 or newer.

Add the server to Claude Code (`~/.claude/settings.json` or a project `.claude/settings.json`):

```json
{
  "mcpServers": {
    "mtropro": {
      "command": "npx",
      "args": ["-y", "@mtropro/mcp"],
      "env": {
        "MTROPRO_API_KEY": "your-api-key"
      }
    }
  }
}
```

Claude Desktop takes the same block in `claude_desktop_config.json`.

## Run from source

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
`properties_list` `properties_get` `properties_get_by_entity` `properties_create` `properties_update` `properties_delete` `properties_invite_owners` `properties_get_synced_calendar_events` `properties_calculate_rate` `properties_send_invitation`

### Inventory
`inventory_catalog` `inventory_list` `inventory_create_item` `inventory_update_item` `inventory_delete_item`

### Bookings
`bookings_list` `bookings_get` `bookings_create` `bookings_update` `bookings_delete` `bookings_check_availability` `bookings_block_dates` `bookings_update_block_dates` `bookings_delete_block_dates` `bookings_reverse_to_lead` `bookings_sign` `bookings_set_primary_guest` `bookings_request_background_check` `bookings_set_background_check_approval` `bookings_set_lease_prepared`

### Guests
`guests_search` `guests_create` `guests_update` `guests_delete`

### Vendors
`vendors_list` `vendors_get` `vendors_get_by_entity` `vendors_create` `vendors_update` `vendors_delete`

### Tasks
`tasks_list` `tasks_get` `tasks_get_by_entity` `tasks_get_by_vendor` `tasks_create` `tasks_update` `tasks_delete`

### Leads (CRM)
`leads_list` `leads_create` `leads_update` `leads_update_stage` `leads_delete`

### Pipeline stages
`pipeline_stages_list` `pipeline_stages_create` `pipeline_stages_update` `pipeline_stages_delete` `pipeline_stages_reorder`

### Templates
`templates_list` `templates_get` `templates_get_by_entity` `templates_get_public` `templates_create` `templates_update` `templates_delete` `templates_generate_lease` `templates_preview_render` `templates_import_word`

### Conversations
`conversations_list` `conversations_get` `conversations_get_by_entity` `conversations_create` `conversations_add_message` `conversations_send_message` `conversations_update` `conversations_mark_read` `conversations_mark_unread` `conversations_retry_message` `conversations_edit_message` `conversations_delete_message`

### Message templates
`message_templates_list` `message_templates_get` `message_templates_create` `message_templates_update` `message_templates_delete`

### Payments
`payments_list` `payments_create` `payments_create_manual` `payments_mark_paid` `payments_check` `payments_capture` `payments_cancel` `payments_update` `payments_generate_link` `payments_send_reminder` `payments_recurring_list` `payments_recurring_create` `payments_recurring_cancel` `payments_recurring_reschedule`

### Stripe accounts
`stripe_accounts_list` `stripe_accounts_create` `stripe_accounts_get_onboarding_link` `stripe_accounts_refresh_status` `stripe_accounts_get_dashboard` `stripe_accounts_get_references` `stripe_accounts_set_default` `stripe_accounts_update` `stripe_accounts_delete`

### Notes
`notes_list` `notes_create` `notes_delete`

### Reminders
`reminders_list` `reminders_list_by_entity` `reminders_create` `reminders_update` `reminders_delete`

### Notifications
`notifications_list` `notifications_unread_count` `notifications_mark_read` `notifications_mark_all_read` `notifications_delete` `notifications_create` `notifications_send_email`

### Reports
`reports_property_summary` `reports_trends`

### Report widgets
`report_widgets_list` `report_widgets_get` `report_widgets_data` `report_widgets_ai_assist` `report_widgets_create` `report_widgets_update` `report_widgets_delete`

### Subscriptions
`subscriptions_plans` `subscriptions_plans_all` `subscriptions_my` `subscriptions_payments` `subscriptions_checkout` `subscriptions_cancel` `subscriptions_cancel_pending`

### Polls
`polls_list` `polls_get` `polls_active` `polls_results` `polls_vote`

### Admin utilities
`api_keys_list` `api_keys_generate` `api_keys_revoke` `api_keys_delete` `fields_list` `fields_get_by_entity` `fields_create` `fields_update` `fields_delete` `logs_get` `logs_stats` `logs_actions` `nav_counts`

### Campaigns
`campaigns_list` `campaigns_get` `campaigns_create` `campaigns_stop` `campaigns_resume` `campaigns_delete`

### Import jobs
`import_jobs_list` `import_jobs_get` `import_jobs_create` `import_jobs_cancel` `import_jobs_mark_reviewed` `ff_import_scrape` `ff_import_upload_images`

### Entities
`entities_list` `entities_get`

### Users
`whoami`

## Development

```bash
pnpm dev
```

Runs the server with `tsx` for live TypeScript execution.

### Route coverage audit

```bash
pnpm audit:core-routes
```

The audit compares MCP Core calls with mounted routes in `../core/app.ts` and fails when an MCP tool points to a missing Core endpoint.

### Agent-style MCP tests

```bash
pnpm test:agent-harness
```

The harness starts a mocked MTRO Core API, launches this MCP server over stdio, lists tools through the MCP client, calls representative tools, and verifies:

- no duplicate tool names
- expected high-priority tools are exposed
- Core requests use `Authorization: Bearer <MTROPRO_API_KEY>`
- GET query parameters are forwarded correctly
- POST/PATCH/DELETE payloads and route params are forwarded correctly
- every MCP Core call maps to a mounted Core route
