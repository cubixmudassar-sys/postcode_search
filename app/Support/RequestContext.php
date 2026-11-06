<?php

namespace App\Support;

use App\Models\Organisation;
use App\Models\Project;
use Illuminate\Http\Request;

class RequestContext
{
    public static function organisation(Request $request): ?Organisation
    {
        return $request->attributes->get('organisation');
    }

    public static function project(Request $request): ?Project
    {
        return $request->attributes->get('project');
    }

    public static function environment(Request $request): string
    {
        return $request->attributes->get('environment')
            ?? $request->header('X-Environment', 'Live');
    }
}
