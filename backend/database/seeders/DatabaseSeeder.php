<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // \App\Models\User::factory(10)->create();

        // ↓↓↓ この call(...) を追記 ↓↓↓
        // 順番が重要（UserSeederが先）
        $this->call([
            UserSeeder::class,
            EventTicketSeeder::class,
        ]);
    }
}