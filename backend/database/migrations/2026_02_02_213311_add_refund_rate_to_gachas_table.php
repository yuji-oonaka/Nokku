<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('gachas', function (Blueprint $table) {
            // NOKKU Policy: 財務に関わる「率」は decimal で保持し、浮動小数点の誤差を回避する
            $table->decimal('refund_rate', 3, 2)
                ->default(0.50)
                ->after('consumption_point')
                ->comment('Refund rate (0.00 - 1.00). 0.50 = 50% refund.');
        });
    }

    public function down(): void
    {
        Schema::table('gachas', function (Blueprint $table) {
            $table->dropColumn('refund_rate');
        });
    }
};
