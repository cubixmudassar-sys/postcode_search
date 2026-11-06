<?php

namespace Database\Seeders;

use App\Models\Address;
use App\Models\ApiKey;
use App\Models\AuditLog;
use App\Models\Organisation;
use App\Models\Postcode;
use App\Models\Project;
use App\Models\Provider;
use App\Models\UsageLog;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call(PricingPackageSeeder::class);

        User::query()->where('email', 'test@example.com')->delete();

        $admin = User::query()->updateOrCreate(
            ['email' => 'admin@postcodepulse.demo'],
            [
                'first_name' => 'Admin',
                'last_name' => 'User',
                'name' => 'Admin User',
                'password' => 'password',
                'is_staff' => true,
                'use_case' => 'Platform operations',
            ],
        );

        $emma = User::query()->updateOrCreate(
            ['email' => 'emma@northstar.demo'],
            [
                'first_name' => 'Emma',
                'last_name' => 'Morgan',
                'name' => 'Emma Morgan',
                'password' => 'demopassword',
                'is_staff' => false,
                'use_case' => 'E-commerce checkout validation',
            ],
        );

        $alex = User::query()->updateOrCreate(
            ['email' => 'alex@northstar.demo'],
            [
                'first_name' => 'Alex',
                'last_name' => 'Chen',
                'name' => 'Alex Chen',
                'password' => 'demopassword',
                'is_staff' => false,
            ],
        );

        $priya = User::query()->updateOrCreate(
            ['email' => 'priya@northstar.demo'],
            [
                'first_name' => 'Priya',
                'last_name' => 'Shah',
                'name' => 'Priya Shah',
                'password' => 'demopassword',
                'is_staff' => false,
            ],
        );

        $northstar = Organisation::query()->updateOrCreate(
            ['name' => 'Northstar Retail'],
            [
                'credit_balance' => 42.60,
                'monthly_spend' => 67.40,
                'plan' => 'business',
                'auto_topup_enabled' => true,
                'auto_topup_amount' => 20,
                'auto_topup_cap' => 100,
                'vat_number' => 'GB 123 4567 89',
                'billing_name' => 'Northstar Retail Ltd',
                'card_last4' => '4242',
                'card_brand' => 'Visa',
                'card_expires' => '08/28',
            ],
        );

        $northstar->users()->syncWithoutDetaching([
            $emma->id => ['role' => 'Owner'],
            $alex->id => ['role' => 'Developer'],
            $priya->id => ['role' => 'Billing'],
        ]);

        $checkout = Project::query()->updateOrCreate(
            ['organisation_id' => $northstar->id, 'name' => 'Checkout'],
            ['environment' => 'Live', 'request_count' => 12840],
        );

        $crm = Project::query()->updateOrCreate(
            ['organisation_id' => $northstar->id, 'name' => 'CRM enrichment'],
            ['environment' => 'Live', 'request_count' => 9421],
        );

        $operations = Project::query()->updateOrCreate(
            ['organisation_id' => $northstar->id, 'name' => 'Operations tools'],
            ['environment' => 'Test', 'request_count' => 3110],
        );

        $this->seedApiKey($northstar, $checkout, 'Checkout browser', 'Restricted', 'Test', 'pp_test_demo4f2a00000000000001');
        $this->seedApiKey($northstar, $crm, 'CRM server', 'Secret', 'Live', 'pp_live_demo9bc1000000000000001');
        $this->seedApiKey($northstar, $operations, 'Operations tool', 'Restricted', 'Test', 'pp_test_demo81de00000000000001');

        $this->seedPostcodes();
        $this->seedAddresses();
        $this->seedUsageLogs($northstar, $checkout, $crm, $operations, $emma);
        $this->seedProviders();
        $this->seedAuditLogs($admin, $northstar);
    }

    private function seedApiKey(
        Organisation $organisation,
        Project $project,
        string $name,
        string $type,
        string $environment,
        string $plainKey,
    ): void {
        ApiKey::query()->updateOrCreate(
            [
                'organisation_id' => $organisation->id,
                'name' => $name,
            ],
            [
                'project_id' => $project->id,
                'type' => $type,
                'environment' => $environment,
                'key_prefix' => substr($plainKey, 0, 16),
                'key_hash' => ApiKey::hashKey($plainKey),
                'last_used_at' => now()->subHours(random_int(1, 48)),
            ],
        );
    }

    private function seedPostcodes(): void
    {
        $records = [
            ['SW1A 2AA', 'SW1A', '2AA', 'SW', 'LONDON', 'England', 'London', 'Westminster', 'Cities of London and Westminster', 'London', 'Greater London', 'Westminster', 51.5035400, -0.1276700, 530047, 179951, 1],
            ['SW1A 1AA', 'SW1A', '1AA', 'SW', 'LONDON', 'England', 'London', 'Westminster', 'Cities of London and Westminster', 'London', 'Greater London', 'Westminster', 51.5010100, -0.1415630, 529980, 179645, 1],
            ['EC1A 1BB', 'EC1A', '1BB', 'EC', 'LONDON', 'England', 'London', 'City of London', 'Cities of London and Westminster', 'London', 'Greater London', 'City of London Corporation', 51.5245200, -0.1039600, 532544, 182127, 1],
            ['M1 1AE', 'M1', '1AE', 'M', 'MANCHESTER', 'England', 'North West', 'Manchester', 'Manchester Central', 'North West', 'Greater Manchester', 'Manchester', 53.4794400, -2.2453200, 384848, 398849, 1],
            ['B1 1TB', 'B1', '1TB', 'B', 'BIRMINGHAM', 'England', 'West Midlands', 'Birmingham', 'Birmingham Ladywood', 'West Midlands', 'West Midlands', 'Birmingham', 52.4796990, -1.9026910, 406897, 286864, 1],
            ['EH1 1YZ', 'EH1', '1YZ', 'EH', 'EDINBURGH', 'Scotland', 'Scotland', 'City of Edinburgh', 'Edinburgh East', 'Scotland', 'City of Edinburgh', 'City of Edinburgh', 55.9532520, -3.1882670, 325718, 673590, 1],
            ['CF10 1EP', 'CF10', '1EP', 'CF', 'CARDIFF', 'Wales', 'Wales', 'Cardiff', 'Cardiff Central', 'Wales', 'South Glamorgan', 'Cardiff', 51.4815800, -3.1790900, 318088, 176115, 1],
            ['BT1 5GS', 'BT1', '5GS', 'BT', 'BELFAST', 'Northern Ireland', 'Northern Ireland', 'Belfast', 'Belfast South', 'Northern Ireland', 'County Antrim', 'Belfast', 54.5972850, -5.9301200, 333644, 535085, 1],
        ];

        foreach ($records as [$postcode, $outward, $inward, $area, $town, $country, $region, $district, $constituency, $nhs, $county, $authority, $lat, $lng, $e, $n, $quality]) {
            Postcode::query()->updateOrCreate(
                ['postcode' => $postcode],
                [
                    'outward' => $outward,
                    'inward' => $inward,
                    'area' => $area,
                    'post_town' => $town,
                    'country' => $country,
                    'region' => $region,
                    'admin_district' => $district,
                    'constituency' => $constituency,
                    'nhs_region' => $nhs,
                    'ceremonial_county' => $county,
                    'local_authority' => $authority,
                    'latitude' => $lat,
                    'longitude' => $lng,
                    'eastings' => $e,
                    'northings' => $n,
                    'quality' => $quality,
                    'status' => 'current',
                    'source' => 'ordnance_survey_open_data',
                    'record_updated' => now()->subMonths(2)->toDateString(),
                ],
            );
        }
    }

    private function seedAddresses(): void
    {
        $rows = [
            ['SW1A 2AA', '10 Downing Street', '10 Downing Street', 'Westminster', 'LONDON', '100023336066', 51.5034000, -0.1276000, 'property'],
            ['SW1A 2AA', '11 Downing Street', '11 Downing Street', 'Westminster', 'LONDON', null, 51.5034500, -0.1275500, 'property'],
            ['SW1A 2AA', '12 Downing Street', '12 Downing Street', 'Westminster', 'LONDON', null, 51.5035000, -0.1275000, 'property'],
        ];

        Address::query()->where('postcode', 'SW1A 2AA')->delete();

        foreach ($rows as [$postcode, $building, $line1, $locality, $town, $uprn, $lat, $lng, $precision]) {
            Address::query()->create([
                'postcode' => $postcode,
                'building' => $building,
                'line1' => $line1,
                'locality' => $locality,
                'post_town' => $town,
                'uprn' => $uprn,
                'latitude' => $lat,
                'longitude' => $lng,
                'precision' => $precision,
            ]);
        }
    }

    private function seedUsageLogs(
        Organisation $organisation,
        Project $checkout,
        Project $crm,
        Project $operations,
        User $emma,
    ): void {
        UsageLog::query()->where('organisation_id', $organisation->id)->delete();

        $logs = [
            ['req_9f2a71c4', 'SW1A 2AA', 'Westminster, London', $checkout->id, 'Postcode lookup', '200', 'Billable', 0.0020, 84, 'Live'],
            ['req_81cd44ef', 'EC1A 1BB', 'City of London, London', $crm->id, 'Postcode lookup', '200', 'Billable', 0.0020, 91, 'Live'],
            ['req_14be92d1', 'M1 1AE', 'Manchester', $checkout->id, 'Address lookup', '200', 'Billable', 0.0030, 126, 'Live'],
            ['req_06ef17ab', 'ZZ1 1ZZ', 'No matching postcode', $operations->id, 'Postcode lookup', '404', 'Not billed', 0, 42, 'Test'],
            ['req_22ab90c5', 'B1 1TB', 'Birmingham', $checkout->id, 'Address lookup', '429', 'Not billed', 0, 31, 'Live'],
            ['req_77ac281f', 'EH1 1YZ', 'Edinburgh, Scotland', $crm->id, 'Postcode lookup', '200', 'Billable', 0.0020, 87, 'Test'],
            ['req_53de829b', 'CF10 1EP', 'Cardiff, Wales', $operations->id, 'Postcode lookup', '200', 'Billable', 0.0020, 78, 'Live'],
            ['req_31bc05ea', 'BT1 5GS', 'Belfast, Northern Ireland', $checkout->id, 'Address lookup', '200', 'Billable', 0.0030, 114, 'Live'],
        ];

        foreach ($logs as [$requestId, $postcode, $location, $projectId, $endpoint, $status, $outcome, $cost, $latency, $environment]) {
            UsageLog::query()->create([
                'organisation_id' => $organisation->id,
                'project_id' => $projectId,
                'user_id' => $emma->id,
                'postcode' => $postcode,
                'location' => $location,
                'endpoint' => $endpoint,
                'status' => $status,
                'outcome' => $outcome,
                'cost' => $cost,
                'latency_ms' => $latency,
                'request_id' => $requestId,
                'environment' => $environment,
                'created_at' => now()->subHours(random_int(1, 10)),
            ]);
        }
    }

    private function seedProviders(): void
    {
        $providers = [
            ['Postcode Core', 99.99, 84, 'Operational'],
            ['Address Provider A', 99.95, 228, 'Operational'],
            ['Address Provider B', 97.82, 840, 'Degraded'],
            ['UPRN Enrichment', 99.91, 312, 'Operational'],
        ];

        foreach ($providers as [$name, $uptime, $latency, $status]) {
            Provider::query()->updateOrCreate(
                ['name' => $name],
                [
                    'uptime_pct' => $uptime,
                    'latency_ms' => $latency,
                    'status' => $status,
                ],
            );
        }
    }

    private function seedAuditLogs(User $admin, Organisation $northstar): void
    {
        AuditLog::query()->delete();

        $entries = [
            ['Rate limit updated', ['area' => 'Address autocomplete', 'actor' => 'A. Patel']],
            ['Balance adjustment approved', ['organisation' => $northstar->name, 'amount' => 25, 'actor' => 'J. Hall']],
            ['Provider failover disabled', ['reason' => 'Schema incompatibility', 'actor' => 'S. Evans']],
        ];

        foreach ($entries as [$action, $meta]) {
            AuditLog::query()->create([
                'user_id' => $admin->id,
                'organisation_id' => $northstar->id,
                'action' => $action,
                'meta' => $meta,
                'created_at' => now()->subMinutes(random_int(8, 60)),
            ]);
        }
    }
}
