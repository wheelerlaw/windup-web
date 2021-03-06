import {AfterViewInit, Component, OnDestroy, OnInit, ViewChild} from "@angular/core";
import {Router} from "@angular/router";

import {ExtendedMigrationProject, MigrationProjectService} from "./migration-project.service";
import {MigrationProject} from "../generated/windup-services";
import {NotificationService} from "../core/notification/notification.service";
import {utils} from "../shared/utils";
import {ConfirmationModalComponent} from "../shared/dialog/confirmation-modal.component";
import {OrderDirection, SortingService} from "../shared/sort/sorting.service";
import {WindupService} from "../services/windup.service";
import {EventBusService} from "../core/events/event-bus.service";
import {DeleteMigrationProjectEvent} from "../core/events/windup-event";
import { filter } from 'rxjs/operators';

@Component({
    templateUrl: './project-list.component.html',
    styleUrls: [
        './project-list.component.scss',
    ],
    providers: [
        SortingService
    ]
})
export class ProjectListComponent implements OnDestroy, OnInit, AfterViewInit {
    private _originalProjects: MigrationProject[] = [];

    loading: boolean = true;
    get totalProjectCount(): number {
        if (this._originalProjects == null)
            return 0;

        return this._originalProjects.length;
    }

    projects: ExtendedMigrationProject[] = [];

    @ViewChild('deleteProjectModal')
    readonly deleteProjectModal: ConfirmationModalComponent;

    searchValue: string = '';
    private deletedEventSubscription;

    sort = {
        sortOptions: [
            { name: 'Name', field: 'title' },
            { name: 'Created date', field: 'created' },
            { name: 'Last modified date', field: 'lastModified' },
            { name: 'Number of applications', field: (proj:MigrationProject) => proj.applications ? proj.applications.length : 0 },
        ],
        selectedOption: { name: 'Name', field: 'title' },
        direction: OrderDirection.ASC
    };

    constructor(
        private _router: Router,
        private _migrationProjectService: MigrationProjectService,
        private _notificationService: NotificationService,
        private _sortingService: SortingService<MigrationProject>,
        private _windupService: WindupService,
        private _eventBus: EventBusService
    ) {
        this.deletedEventSubscription = this._eventBus.onEvent
            .pipe(
                filter(event => event.isTypeOf(DeleteMigrationProjectEvent))
            )
            .subscribe(event => {
                this.getMigrationProjects();
            })
    }

    ngOnInit(): any {
        this.updateSort();
        this.getMigrationProjects();
    }

    ngOnDestroy(): void {
        this.deletedEventSubscription.unsubscribe();
    }

    ngAfterViewInit(): void {
        this.deleteProjectModal.closed.subscribe(() => {
            this.deleteProjectModal.title = '';
            this.deleteProjectModal.body = '';
            this.deleteProjectModal.confirmPhrase = '';
            this.deleteProjectModal.typedConfirmationPhrase = '';
            this.deleteProjectModal.data = null;
        });

        this.deleteProjectModal.confirmed.subscribe(project => this.doDeleteProject(project));
    }

    getMigrationProjects() {
        return this._migrationProjectService.getAll().subscribe(
            projects => this.projectsLoaded(projects),
            error => this._notificationService.error(utils.getErrorMessage(error))
        );
    }

    projectsLoaded(projects:MigrationProject[]) {
        this.loading = false;
        this._originalProjects = projects;
        this.updateProjects();
    }

    createMigrationProject() {
        this._router.navigate(['/wizard/create-project']);
    }

    editProject(event: Event, project: MigrationProject) {
        event.stopPropagation();

        this._router.navigate([`/projects/${project.id}/edit`]);
        return false;
    }

    viewProject(event: Event, project:MigrationProject) {
        event.stopPropagation();

        if (this.isDeleting(project))
            return false;

        this._router.navigate(['/projects', project.id]);
        return false;
    }

    updateSort() {
        this._sortingService.orderBy(this.sort.selectedOption.field, this.sort.direction);
        this.updateProjects();
    }

    updateSearch(value: string) {
        this.searchValue = value;
        this.updateProjects();
    }

    updateProjects() {
        this.projects = this._sortingService.sort(this.filterProjects());
    }

    filterProjects(): MigrationProject[] {
        if (this.searchValue && this.searchValue.length > 0) {
            return this._originalProjects.filter(project => project.title.search(new RegExp(this.searchValue, 'i')) !== -1);
        }

        return this._originalProjects;
    }

    private doDeleteProject(project: MigrationProject) {
        this._migrationProjectService.delete(project).subscribe(
            success => {
                this._notificationService.success(`Project '${project.title}' was deleted.`);
                let index = this._originalProjects.indexOf(project);
                this._originalProjects.splice(index, 1);
                this.updateProjects();
            },
            error => {
                this._notificationService.error(utils.getErrorMessage(error));
            }
        );
    }

    isDeleting(project: MigrationProject) {
        return this._migrationProjectService.isDeleting(project);
    }

    confirmDeleteProject(event: Event, project: ExtendedMigrationProject) {
        event.stopPropagation();

        if (!project.isDeletable) {
            return false;
        }

        this._windupService.getProjectExecutions(project.id).subscribe((executions) => {
            let inProgressExecution = executions.find((execution) => {
                return execution.state == "QUEUED" || execution.state == "STARTED";
            });

            if (inProgressExecution) {
                this._notificationService.error(`Cannot delete project '${project.title}' while an analysis is in progress.`);
                return;
            }

            this.deleteProjectModal.title = `Confirm Project Deletion`;
            this.deleteProjectModal.body = `<p>Are you sure you want to delete the project '${project.title}'? 
                                            This will <strong>delete all resources</strong> associated with \
                                            '${project.title}' and <strong>cannot be undone</strong>. \
                                            Make sure this is something you really want to do!</p>`;
            this.deleteProjectModal.confirmPhrase = project.title;
            this.deleteProjectModal.data = project;

            this.deleteProjectModal.show();
        }, error => {
            this._notificationService.error(utils.getErrorMessage(error));
        });
    }
}
