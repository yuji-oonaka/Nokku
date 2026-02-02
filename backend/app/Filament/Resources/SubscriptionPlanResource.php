<?php

namespace App\Filament\Resources;

use App\Filament\Resources\SubscriptionPlanResource\Pages;
use App\Models\SubscriptionPlan;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class SubscriptionPlanResource extends Resource
{
    protected static ?string $model = SubscriptionPlan::class;

    protected static ?string $navigationIcon = 'heroicon-o-credit-card';
    protected static ?string $navigationLabel = 'サブスクプラン管理';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('基本情報')
                    ->schema([
                        Forms\Components\TextInput::make('plan_id')
                            ->required()
                            ->unique(ignoreRecord: true)
                            ->label('プランID (entryなど)'),
                        Forms\Components\TextInput::make('name')
                            ->required()
                            ->label('表示プラン名'),
                        Forms\Components\TextInput::make('rank')
                            ->numeric()
                            ->required()
                            ->label('ランク (強さ/並び順)'),
                        // ★ カラーピッカーでアプリ上の色を直感的に変更可能
                        Forms\Components\ColorPicker::make('color_code')
                            ->required()
                            ->label('カードカラー'),
                    ])->columns(2),

                Forms\Components\Section::make('価格・ポイント・Stripe連携')
                    ->schema([
                        Forms\Components\TextInput::make('price_yen')
                            ->numeric()
                            ->prefix('¥')
                            ->required()
                            ->label('月額料金'),
                        Forms\Components\TextInput::make('monthly_points')
                            ->numeric()
                            ->suffix('pt')
                            ->required()
                            ->label('付与ポイント'),
                        Forms\Components\TextInput::make('stripe_price_id')
                            ->required()
                            ->label('Stripe価格ID (price_xxxx)'),
                    ])->columns(3),

                Forms\Components\Section::make('詳細・おすすめ設定')
                    ->schema([
                        Forms\Components\Textarea::make('description')
                            ->required()
                            ->label('説明文'),
                        Forms\Components\Toggle::make('is_recommended')
                            ->label('おすすめバッジを表示'),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('rank')
                    ->sortable()
                    ->label('順位'),
                Tables\Columns\TextColumn::make('name')
                    ->searchable()
                    ->label('プラン名'),
                Tables\Columns\ColorColumn::make('color_code')
                    ->label('色'),
                Tables\Columns\TextColumn::make('price_yen')
                    ->money('JPY')
                    ->label('料金'),
                Tables\Columns\TextColumn::make('monthly_points')
                    ->formatStateUsing(fn($state) => number_format($state) . ' pt')
                    ->label('ポイント'),
                Tables\Columns\IconColumn::make('is_recommended')
                    ->boolean()
                    ->label('おすすめ'),
            ])
            ->defaultSort('rank', 'asc')
            ->filters([
                //
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListSubscriptionPlans::route('/'),
            'create' => Pages\CreateSubscriptionPlan::route('/create'),
            'edit' => Pages\EditSubscriptionPlan::route('/{record}/edit'),
        ];
    }
}
