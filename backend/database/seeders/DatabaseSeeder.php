<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // ★ 呼び出し順序を明示的に指定
        $this->call([
            UserSeeder::class,
            EventTicketSeeder::class,
            // 他に Seeder があればここに追加
        ]);
    }
}