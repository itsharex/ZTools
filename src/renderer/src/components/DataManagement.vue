<template>
  <div class="data-management">
    <h2 class="title">我的数据</h2>
    <p class="description">查看和管理插件存储的数据</p>

    <div v-if="pluginDataList.length === 0" class="empty">
      <p>暂无插件数据</p>
    </div>

    <div v-else class="plugin-list">
      <div v-for="pluginData in pluginDataList" :key="pluginData.pluginName" class="card plugin-card">
        <img v-if="pluginData.logo" :src="pluginData.logo" class="plugin-icon" alt="插件图标" />
        <div v-else class="plugin-icon-placeholder">🧩</div>

        <div class="plugin-info">
          <h3 class="plugin-name">{{ pluginData.pluginName }}</h3>
          <span class="doc-count"
            >{{ pluginData.docCount }} 个文档 / {{ pluginData.attachmentCount }} 个附件</span
          >
        </div>
        
        <button class="btn btn-primary" @click="viewPluginDocs(pluginData.pluginName)">查看文档</button>
      </div>
    </div>

    <!-- 文档列表弹窗 -->
    <div v-if="showDocListModal" class="modal-overlay" @click="closeDocListModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ currentPluginName }} - 文档列表</h3>
          <div class="header-actions">
            <button class="btn btn-icon btn-danger" title="清空所有数据" @click="handleClearData">
              <Icon name="trash" :size="18" />
            </button>
            <button class="btn btn-icon" @click="closeDocListModal">
              <Icon name="close" :size="18" />
            </button>
          </div>
        </div>
        <div class="modal-body">
          <div v-if="docKeys.length === 0" class="empty">暂无文档</div>
          <div v-else class="doc-list">
            <div
              v-for="docItem in docKeys"
              :key="docItem.key"
              class="card doc-card"
              :class="{ active: selectedDocKey === docItem.key }"
              @click="viewDocContent(docItem.key)"
            >
              <span class="doc-key">{{ docItem.key }}</span>
              <span class="doc-type-badge" :class="`type-${docItem.type}`">
                {{ docItem.type === 'document' ? '文档' : '附件' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 文档详情弹窗 -->
    <div v-if="showDocDetailModal" class="modal-overlay" @click="closeDocDetailModal">
      <div class="modal-content modal-large" @click.stop>
        <div class="modal-header">
          <h3>文档详情</h3>
          <button class="btn btn-icon" @click="closeDocDetailModal">
            <Icon name="close" :size="18" />
          </button>
        </div>
        <div class="modal-body">
          <div class="doc-key-display">
            <span class="label">Key:</span>
            <span class="value">{{ selectedDocKey }}</span>
          </div>
          <div class="doc-key-display">
            <span class="label">类型:</span>
            <span class="value type-badge" :class="`type-${currentDocType}`">
              {{ currentDocType === 'document' ? '文档' : '附件' }}
            </span>
          </div>
          <div class="doc-content">
            <pre>{{ formattedDocContent }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Icon from './Icon.vue'

interface PluginData {
  pluginName: string
  docCount: number
  attachmentCount: number
  logo: string | null
}

interface DocItem {
  key: string
  type: 'document' | 'attachment'
}

const pluginDataList = ref<PluginData[]>([])
const showDocListModal = ref(false)
const showDocDetailModal = ref(false)
const currentPluginName = ref('')
const docKeys = ref<DocItem[]>([])
const selectedDocKey = ref('')
const currentDocContent = ref<any>(null)
const currentDocType = ref<'document' | 'attachment'>('document')

// 格式化文档内容
const formattedDocContent = computed(() => {
  if (!currentDocContent.value) return ''
  return JSON.stringify(currentDocContent.value, null, 2)
})

// 加载插件数据统计
async function loadPluginData(): Promise<void> {
  try {
    const result = await window.ztools.getPluginDataStats()
    if (result.success) {
      pluginDataList.value = result.data || []
    }
  } catch (error) {
    console.error('加载插件数据失败:', error)
  }
}

// 查看插件文档
async function viewPluginDocs(pluginName: string): Promise<void> {
  currentPluginName.value = pluginName
  showDocListModal.value = true

  try {
    const result = await window.ztools.getPluginDocKeys(pluginName)
    if (result.success) {
      docKeys.value = result.data || []
    }
  } catch (error) {
    console.error('加载文档列表失败:', error)
  }
}

// 查看文档内容
async function viewDocContent(key: string): Promise<void> {
  selectedDocKey.value = key
  showDocDetailModal.value = true

  try {
    const result = await window.ztools.getPluginDoc(currentPluginName.value, key)
    if (result.success) {
      currentDocContent.value = result.data
      currentDocType.value = result.type || 'document'
    }
  } catch (error) {
    console.error('加载文档内容失败:', error)
  }
}

// 关闭文档列表弹窗
function closeDocListModal(): void {
  showDocListModal.value = false
  currentPluginName.value = ''
  docKeys.value = []
  selectedDocKey.value = ''
}

// 关闭文档详情弹窗
function closeDocDetailModal(): void {
  showDocDetailModal.value = false
  selectedDocKey.value = ''
  currentDocContent.value = null
}

// 清空插件数据
async function handleClearData(): Promise<void> {
  if (!currentPluginName.value) return

  // 确认操作
  if (
    !confirm(
      `确定要清空插件"${currentPluginName.value}"的所有数据吗？\n\n此操作将删除该插件的所有文档，无法恢复。`
    )
  ) {
    return
  }

  try {
    const result = await window.ztools.clearPluginData(currentPluginName.value)
    if (result.success) {
      alert(`已成功清空 ${result.deletedCount} 个文档`)
      // 关闭弹窗
      closeDocListModal()
      // 重新加载插件数据统计
      await loadPluginData()
    } else {
      alert(`清空数据失败: ${result.error}`)
    }
  } catch (error) {
    console.error('清空数据失败:', error)
    alert('清空数据失败')
  }
}

onMounted(() => {
  loadPluginData()
})
</script>

<style scoped>
.data-management {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--card-bg);
}

/* 自定义滚动条 */
.data-management::-webkit-scrollbar {
  width: 6px;
}

.data-management::-webkit-scrollbar-track {
  background: transparent;
}

.data-management::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.data-management::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

.title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.description {
  color: var(--text-secondary);
  margin-bottom: 24px;
  font-size: 14px;
}

.loading,
.empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
  font-size: 14px;
}

.plugin-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.plugin-card {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  cursor: default;
  transition: all 0.2s;
}

.plugin-card:hover {
  background: var(--hover-bg);
  transform: translateX(2px);
}

.plugin-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  margin-right: 14px;
  flex-shrink: 0;
  object-fit: cover;
}

.plugin-icon-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  margin-right: 14px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--active-bg);
  font-size: 24px;
}

.plugin-info {
  flex: 1;
  min-width: 0;
}

.plugin-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  margin-bottom: 4px;
}

.doc-count {
  font-size: 12px;
  color: var(--text-secondary);
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--dialog-bg);
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.modal-large {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--divider-color);
}

.modal-header h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 关闭按钮特殊样式 */
.btn.btn-icon {
  font-size: 24px;
  font-weight: 300;
}

.modal-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.doc-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.doc-card {
  padding: 10px 12px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
}

.doc-card:hover {
  background: var(--hover-bg);
  transform: translateX(2px);
}

.doc-card.active {
  background: var(--active-bg);
}

.doc-key {
  flex: 1;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  color: var(--text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-type-badge {
  margin-left: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.doc-type-badge.type-document {
  background: var(--primary-light-bg);
  color: var(--primary-color);
}

.doc-type-badge.type-attachment {
  background: var(--purple-light-bg);
  color: var(--purple-color);
}

.doc-key-display {
  margin-bottom: 10px;
  padding: 8px 12px;
  background: var(--bg-color);
  border-radius: 6px;
  font-size: 13px;
}

.doc-key-display .label {
  color: var(--text-secondary);
  margin-right: 8px;
  font-weight: 600;
}

.doc-key-display .value {
  color: var(--text-primary);
  font-family: 'Monaco', 'Menlo', monospace;
}

.doc-key-display .value.type-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  font-family: system-ui, -apple-system, sans-serif;
}

.doc-key-display .value.type-badge.type-document {
  background: var(--primary-light-bg);
  color: var(--primary-color);
}

.doc-key-display .value.type-badge.type-attachment {
  background: var(--purple-light-bg);
  color: var(--purple-color);
}

.doc-content {
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 12px;
  overflow-x: auto;
}

.doc-content pre {
  margin: 0;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-all;
}

/* 滚动条样式 */
.modal-body::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-track {
  background: transparent;
}

.modal-body::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

.doc-content::-webkit-scrollbar {
  height: 6px;
}

.doc-content::-webkit-scrollbar-track {
  background: transparent;
}

.doc-content::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.doc-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}
</style>
