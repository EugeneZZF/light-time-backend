import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { ProjectsQueryDto } from './dto/projects-query.dto';

@ApiTags('Projects')
@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Get published projects with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (max 100)' })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search by title/content' })
  getProjects(@Query() query: ProjectsQueryDto) {
    return this.projectsService.getProjects(query);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get full latest published project with gallery and equipment' })
  getLatestProject() {
    return this.projectsService.getLatestProject();
  }
}
