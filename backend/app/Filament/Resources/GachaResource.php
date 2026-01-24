<?php

namespace App\Filament\Resources;

use App\Filament\Resources\GachaResource\Pages;
use App\Filament\Resources\GachaResource\RelationManagers;
use App\Models\Gacha;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class GachaResource extends Resource
{
    protected static ?string $model = Gacha::class;

    protected static ?string $navigationIcon = 'heroicon-o-rectangle-stack';
    protected static ?string $navigationGroup = 'ガチャ管理';
    protected static ?string $navigationLabel = 'ガチャ筐体管理';
    protected static ?string $modelLabel = 'ガチャ';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('ガチャ基本設定')->schema([
                    Forms\Components\TextInput::make('name')
                        ->label('ガチャ名')
                        ->required()
                        ->maxLength(255),
                    Forms\Components\TextInput::make('consumption_point')
                        ->label('消費ポイント')
                        ->numeric()
                        ->prefix('pt')
                        ->required()
                        ->default(100),
                    Forms\Components\Textarea::make('description')
                        ->label('説明文')
                        ->columnSpanFull(),
                ])->columns(2),

                Forms\Components\Section::make('公開設定')->schema([
                    Forms\Components\DateTimePicker::make('start_at')
                        ->label('開始日時')
                        ->native(false)
                        ->displayFormat('Y/m/d H:i'),
                    Forms\Components\DateTimePicker::make('end_at')
                        ->label('終了日時')
                        ->native(false)
                        ->displayFormat('Y/m/d H:i'),
                    Forms\Components\Toggle::make('is_active')
                        ->label('公開ステータス')
                        ->helperText('オフにすると期間内でも表示されません')
                        ->default(true),
                ])->columns(3),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->label('ガチャ名')
                    ->searchable(),
                Tables\Columns\TextColumn::make('consumption_point')
                    ->label('消費pt')
                    ->sortable(),
                Tables\Columns\IconColumn::make('is_active')
                    ->label('公開中')
                    ->boolean(),
                Tables\Columns\TextColumn::make('start_at')
                    ->label('開始')
                    ->dateTime('m/d H:i')
                    ->sortable(),
                Tables\Columns\TextColumn::make('end_at')
                    ->label('終了')
                    ->dateTime('m/d H:i')
                    ->sortable(),
            ])
            ->filters([
                Tables\Filters\TernaryFilter::make('is_active')
                    ->label('公開ステータス'),
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

    public static function getRelations(): array
    {
        return [
            RelationManagers\ItemsRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListGachas::route('/'),
            'create' => Pages\CreateGacha::route('/create'),
            'edit' => Pages\EditGacha::route('/{record}/edit'),
        ];
    }
}
